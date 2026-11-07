'use strict';

const { PartRequestNotFoundException } = require('../../domain/errors');

/**
 * Query: detalle de una solicitud.
 * Solo lee; devuelve la entidad o lanza 404.
 */
class GetPartRequestById {
  constructor({ partRequestRepository }) {
    this.partRequestRepository = partRequestRepository;
  }

  /**
   * @param {number} id
   * @returns {Promise<import('../../domain/entities/partRequest').PartRequest>}
   */
  async execute(id) {
    const request = await this.partRequestRepository.findById(id);
    if (!request) throw new PartRequestNotFoundException(id);
    return request;
  }
}

module.exports = { GetPartRequestById };
