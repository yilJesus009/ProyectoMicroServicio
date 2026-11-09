'use strict';

const { Supplier } = require('../../domain/entities/supplier');
const { SupplierEvent } = require('../contracts');

/**
 * Caso de uso: aplica un evento de Identidad sobre la copia local de
 * proveedores (docs/eventos.md). Lo llama el consumidor de RabbitMQ
 * (infrastructure/messaging/supplierEventsConsumer.js), que ya validó que
 * el sobre trae `event_id` antes de llegar hasta aquí.
 *
 * Idempotente: si `event_id` ya está en `processed_events`, no hace nada
 * (RabbitMQ entrega al menos una vez). Todo en la MISMA transacción:
 * aplicar el efecto + marcar el evento como procesado.
 */
class ApplySupplierEvent {
  constructor({ supplierRepository, processedEventRepository, unitOfWork }) {
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
      const already = await this.processedEventRepository.isProcessed(envelope.event_id, {
        transaction,
      });
      if (already) return { applied: false };

      await this._applyEffect(envelope, transaction);

      await this.processedEventRepository.markProcessed(envelope.event_id, envelope.event_name, {
        transaction,
      });

      return { applied: true };
    });
  }

  async _applyEffect(envelope, transaction) {
    const { payload } = envelope;

    switch (envelope.event_name) {
      case SupplierEvent.PROFILE_SUBMITTED:
        // Reenvía el perfil: queda sin aprobar hasta un nuevo SUPPLIER_APPROVED,
        // aunque antes ya estuviera aprobado (instrucción del equipo, 2026-11-09).
        await this.supplierRepository.upsert(
          Supplier.submitted(payload.supplier_id, payload.business_name),
          { transaction }
        );
        break;

      case SupplierEvent.APPROVED:
        await this.supplierRepository.upsert(
          Supplier.approved(
            payload.supplier_id,
            payload.business_name,
            payload.city,
            payload.category_ids ?? []
          ),
          { transaction }
        );
        break;

      case SupplierEvent.REJECTED:
        // "Quitar de la copia" (docs/eventos.md): se borra, no se marca approved=false.
        await this.supplierRepository.removeBySupplierId(payload.supplier_id, { transaction });
        break;

      default:
        // No debería llegar: el consumidor solo bindea estas 3 routing keys.
        break;
    }
  }
}

module.exports = { ApplySupplierEvent };
