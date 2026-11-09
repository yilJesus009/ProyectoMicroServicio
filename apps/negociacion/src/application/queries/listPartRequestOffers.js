'use strict';

const { PartRequestNotFoundException, ForbiddenException } = require('../../domain/errors');

/** Query: GET /part-requests/:id/offers?sort=price|days — comparador, solo el dueño. */
class ListPartRequestOffers {
  constructor({ partRequestRepository, offerRepository }) {
    this.partRequestRepository = partRequestRepository;
    this.offerRepository = offerRepository;
  }

  /**
   * @param {number} partRequestId @param {number} requesterId @param {'price'|'days'} [sort]
   */
  async execute(partRequestId, requesterId, sort) {
    const partRequest = await this.partRequestRepository.findById(partRequestId);
    if (!partRequest) throw new PartRequestNotFoundException(partRequestId);

    if (partRequest.userId !== requesterId) {
      throw new ForbiddenException('Solo el dueño de la solicitud puede ver sus ofertas');
    }

    return this.offerRepository.findByPartRequestId(partRequestId, { sort });
  }
}

module.exports = { ListPartRequestOffers };
