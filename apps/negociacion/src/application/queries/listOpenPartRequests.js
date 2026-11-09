'use strict';

const { ForbiddenException } = require('../../domain/errors');
const { PartRequestStatus } = require('../../domain/enums');

/**
 * Query: GET /part-requests/open?city=&category_id= — docs/contratos-api.md
 * marca este endpoint 🏪✅ (solo PROVEEDOR aprobado): se verifica contra la
 * copia local, no solo contra el rol del JWT.
 */
class ListOpenPartRequests {
  constructor({ partRequestRepository, supplierRepository }) {
    this.partRequestRepository = partRequestRepository;
    this.supplierRepository = supplierRepository;
  }

  /**
   * @param {number} requesterId
   * @param {Object} [filters] @param {string} [filters.city] @param {number} [filters.categoryId]
   * @returns {Promise<import('../../domain/entities/partRequest').PartRequest[]>}
   */
  async execute(requesterId, filters = {}) {
    const supplier = await this.supplierRepository.findBySupplierId(requesterId);
    if (!supplier?.approved) {
      throw new ForbiddenException('Solo un proveedor aprobado puede ver solicitudes abiertas');
    }

    return this.partRequestRepository.findAll({
      ...filters,
      statuses: [PartRequestStatus.PUBLISHED, PartRequestStatus.RECEIVING_OFFERS],
    });
  }
}

module.exports = { ListOpenPartRequests };
