'use strict';

/**
 * Contrato del repositorio de ofertas. Interfaz, NO implementación: vive
 * en infrastructure/persistence/.
 */
class IOfferRepository {
  /** @param {Object} [options] @param {unknown} [options.transaction] */
  async findById(id, options = {}) {
    throw new Error('not implemented');
  }

  /** @param {Object} [options] @param {'price'|'days'} [options.sort] */
  async findByPartRequestId(partRequestId, options = {}) {
    throw new Error('not implemented');
  }

  async findBySupplierId(supplierId) {
    throw new Error('not implemented');
  }

  /** La oferta SUBMITTED del proveedor en esa solicitud, si existe (409 al ofertar dos veces). */
  async findActiveBySupplierAndRequest(supplierId, partRequestId, options = {}) {
    throw new Error('not implemented');
  }

  /** La oferta ACCEPTED de la solicitud, si existe (409 en la segunda aceptación). */
  async findAcceptedByPartRequestId(partRequestId, options = {}) {
    throw new Error('not implemented');
  }

  /** @param {Object} [options] @param {unknown} [options.transaction] */
  async save(offer, options = {}) {
    throw new Error('not implemented');
  }

  /**
   * Pasa a REJECTED todas las SUBMITTED de la solicitud, excepto la aceptada.
   * @returns {Promise<Offer[]>} las ofertas que quedaron rechazadas (para los eventos)
   */
  async rejectOthersSubmitted(partRequestId, acceptedOfferId, options = {}) {
    throw new Error('not implemented');
  }
}

module.exports = { IOfferRepository };
