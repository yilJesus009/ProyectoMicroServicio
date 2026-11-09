'use strict';

const { PartRequestNotFoundException, ForbiddenException } = require('../../domain/errors');

/**
 * Query: detalle de una solicitud.
 *
 * docs/contratos-api.md: "Solo el dueño o un proveedor aprobado". El
 * proveedor aprobado se resuelve contra la copia local (supplierRepository),
 * nunca contra el rol del JWT solo: un PROVEEDOR sin aprobar no puede ver
 * solicitudes ajenas.
 */
class GetPartRequestById {
  constructor({ partRequestRepository, supplierRepository }) {
    this.partRequestRepository = partRequestRepository;
    this.supplierRepository = supplierRepository;
  }

  /**
   * @param {number} id
   * @param {Object} [viewer] @param {number} viewer.requesterId
   * @returns {Promise<import('../../domain/entities/partRequest').PartRequest>}
   */
  async execute(id, viewer = {}) {
    const request = await this.partRequestRepository.findById(id);
    if (!request) throw new PartRequestNotFoundException(id);

    if (viewer.requesterId !== undefined) {
      const isApprovedSupplier = await this._isApprovedSupplier(viewer.requesterId);
      if (!request.canBeViewedBy(viewer.requesterId, isApprovedSupplier)) {
        throw new ForbiddenException('No puedes ver esta solicitud');
      }
    }

    return request;
  }

  async _isApprovedSupplier(requesterId) {
    const supplier = await this.supplierRepository.findBySupplierId(requesterId);
    return supplier?.approved === true;
  }
}

module.exports = { GetPartRequestById };
