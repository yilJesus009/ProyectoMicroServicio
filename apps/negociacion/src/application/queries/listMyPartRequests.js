'use strict';

/** Query: GET /part-requests/mine — solo las del dueño autenticado. */
class ListMyPartRequests {
  constructor({ partRequestRepository }) {
    this.partRequestRepository = partRequestRepository;
  }

  /**
   * @param {number} userId
   * @returns {Promise<import('../../domain/entities/partRequest').PartRequest[]>}
   */
  async execute(userId) {
    return this.partRequestRepository.findAll({ userId });
  }
}

module.exports = { ListMyPartRequests };
