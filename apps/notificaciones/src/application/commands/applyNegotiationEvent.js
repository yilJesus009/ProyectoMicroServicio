'use strict';

const { Notification } = require('../../domain/entities/notification');
const { Supplier } = require('../../domain/entities/supplier');
const { buildNotificationForEvent } = require('../buildNotificationForEvent');

/**
 * Caso de uso: aplica un evento de Negociación o Identidad creando el o
 * los avisos correspondientes (docs/plan/fase-2.md, bloque A3). Lo llama
 * el consumidor de RabbitMQ, que ya validó que el sobre trae `event_id`.
 *
 * Idempotente: si `event_id` ya está en `processed_events`, no hace nada.
 * Crear el aviso (o los avisos) y marcar el evento como procesado viajan
 * en la MISMA transacción (ajuste del equipo, 2026-11-09): el consumidor
 * solo hace `ack` después de que esta promesa resuelve, es decir, después
 * del commit.
 */
class ApplyNegotiationEvent {
  constructor({ notificationRepository, supplierRepository, processedEventRepository, unitOfWork }) {
    this.notificationRepository = notificationRepository;
    this.supplierRepository = supplierRepository;
    this.processedEventRepository = processedEventRepository;
    this.unitOfWork = unitOfWork;
  }

  /**
   * @param {Object} envelope Sobre completo (docs/eventos.md), ya con event_id presente
   * @returns {Promise<{applied: boolean}>} applied=false si era un duplicado
   */
  async execute(envelope) {
    return this.unitOfWork.run(async (transaction) => {
      const already = await this.processedEventRepository.isProcessed(envelope.event_id, { transaction });
      if (already) return { applied: false };

      await this._applyEffect(envelope, transaction);

      await this.processedEventRepository.markProcessed(envelope.event_id, envelope.event_name, { transaction });

      return { applied: true };
    });
  }

  async _applyEffect(envelope, transaction) {
    const { event_name: eventName, payload } = envelope;

    if (eventName === 'SUPPLIER_APPROVED') {
      await this.supplierRepository.upsert(
        Supplier.approved(payload.supplier_id, payload.city, payload.category_ids ?? []),
        { transaction }
      );
    } else if (eventName === 'SUPPLIER_REJECTED') {
      await this.supplierRepository.removeBySupplierId(payload.supplier_id, { transaction });
    }

    if (eventName === 'PART_REQUEST_CREATED') {
      await this._notifyApprovedSuppliers(payload, transaction);
      return;
    }

    const built = buildNotificationForEvent(eventName, payload);
    if (!built) return; // no debería pasar: el consumidor solo bindea estos 7 eventos.

    await this.notificationRepository.create(
      new Notification({
        userId: built.userId ?? null,
        role: built.role ?? null,
        type: eventName,
        title: built.title,
        message: built.message,
        link: built.link,
      }),
      { transaction }
    );
  }

  /** PART_REQUEST_CREATED: un aviso por cada proveedor aprobado de esa categoría y ciudad. */
  async _notifyApprovedSuppliers(payload, transaction) {
    const suppliers = await this.supplierRepository.findApprovedByCityAndCategory(
      payload.city,
      payload.category_id,
      { transaction }
    );

    for (const supplier of suppliers) {
      await this.notificationRepository.create(
        new Notification({
          userId: supplier.supplierId,
          type: 'PART_REQUEST_CREATED',
          title: 'Nueva solicitud en tu categoría',
          message: `Nueva solicitud: ${payload.category_name} para ${payload.vehicle_label}`,
          link: `/proveedor/solicitudes/${payload.part_request_id}/ofertar`,
        }),
        { transaction }
      );
    }
  }
}

module.exports = { ApplyNegotiationEvent };
