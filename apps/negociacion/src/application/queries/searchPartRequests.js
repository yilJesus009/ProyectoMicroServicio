'use strict';

/**
 * Query: listado de solicitudes con filtros opcionales.
 * Solo lee.
 */
class SearchPartRequests {
  constructor({ partRequestRepository }) {
    this.partRequestRepository = partRequestRepository;
  }

  /**
   * @param {Object} [filters] { city, status, urgency }
   * @returns {Promise<import('../../domain/entities/partRequest').PartRequest[]>}
   */
  async execute(filters = {}) {
    return this.partRequestRepository.findAll(filters);
  }
}

module.exports = { SearchPartRequests };
