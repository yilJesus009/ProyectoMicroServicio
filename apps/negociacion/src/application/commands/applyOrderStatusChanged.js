'use strict';

const { PartRequestStatus } = require('../../domain/enums');
const { Topic, PartRequestEvent } = require('../contracts');
const { buildEventEnvelope } = require('../buildEventEnvelope');

/**
 * Caso de uso: aplica ORDER_STATUS_CHANGED (Pedidos) sobre la solicitud —
 * el cierre de la fase 3, bloque A2 (docs/eventos.md: "Si es COMPLETED,
 * completar la solicitud"). Lo llama el consumidor de RabbitMQ
 * (infrastructure/messaging/orderEventsConsumer.js), que ya validó que el
 * sobre trae `event_id`.
 *
 * Idempotente en dos niveles, mismo patrón que `offer_id` duplicado en
 * Pedidos:
 *   1. `event_id` ya visto en processed_events → no hace nada (reintento
 *      normal de RabbitMQ).
 *   2. La solicitud YA está COMPLETED (mismo cierre de negocio, pero con
 *      otro `event_id` — por ejemplo Pedidos reenvió el evento) → no es un
 *      error, no se vuelve a completar ni a publicar el evento; solo se
 *      marca este event_id como procesado también.
 *
 * Cualquier `new_status` distinto de COMPLETED es informativo para este
 * servicio (docs/eventos.md: Negociación solo actúa en COMPLETED): se
 * marca procesado y no se hace nada más.
 */
class ApplyOrderStatusChanged {
  constructor({ partRequestRepository, outboxRepository, processedEventRepository, unitOfWork, producer }) {
    this.partRequestRepository = partRequestRepository;
    this.outboxRepository = outboxRepository;
    this.processedEventRepository = processedEventRepository;
    this.unitOfWork = unitOfWork;
    this.producer = producer;
  }

  /**
   * @param {Object} envelope Sobre completo (docs/eventos.md), ya con event_id presente
   * @returns {Promise<{applied: boolean}>} applied=false si era un duplicado
   */
  async execute(envelope) {
    return this.unitOfWork.run(async (transaction) => {
      const already = await this.processedEventRepository.isProcessed(envelope.event_id, { transaction });
      if (already) return { applied: false };

      if (envelope.payload.new_status === PartRequestStatus.COMPLETED) {
        await this._completePartRequest(envelope, transaction);
      }

      await this.processedEventRepository.markProcessed(envelope.event_id, envelope.event_name, { transaction });
      return { applied: true };
    });
  }

  async _completePartRequest(envelope, transaction) {
    const { payload, correlation_id: correlationId } = envelope;
    const request = await this.partRequestRepository.findById(payload.part_request_id, { transaction });

    // No debería faltar (ORDER_STATUS_CHANGED siempre trae un part_request_id
    // real), pero si falta no hay nada que completar.
    if (!request) return;

    // Ya está COMPLETED: el mismo cierre de negocio llegó dos veces con
    // event_id distinto. No es un error — no se repite ni se re-publica.
    if (request.status === PartRequestStatus.COMPLETED) return;

    // Si no es una transición legal (p. ej. la solicitud está CANCELLED),
    // es una inconsistencia real entre Pedidos y Negociación: se deja que
    // explote para que el mensaje caiga en la dlq y se revise a mano.
    request.assertCanTransition(PartRequestStatus.COMPLETED);

    const won = await this.partRequestRepository.updateStatusIfCurrent(
      request.id,
      request.status,
      PartRequestStatus.COMPLETED,
      { transaction }
    );
    // Si no ganó el CAS, otra instancia ya la completó entre el findById y
    // el update (misma idea que el offer_id duplicado): no se publica de nuevo.
    if (!won) return;

    const out = buildEventEnvelope({
      eventName: PartRequestEvent.STATUS_CHANGED,
      producer: this.producer,
      correlationId,
      payload: {
        part_request_id: request.id,
        previous_status: request.status,
        new_status: PartRequestStatus.COMPLETED,
      },
    });
    await this.outboxRepository.enqueue(out, {
      exchange: Topic.PART_REQUEST,
      routingKey: PartRequestEvent.STATUS_CHANGED,
      transaction,
    });
  }
}

module.exports = { ApplyOrderStatusChanged };
