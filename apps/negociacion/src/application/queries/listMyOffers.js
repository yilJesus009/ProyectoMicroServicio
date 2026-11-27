'use strict';

/** Query: GET /offers/mine — las ofertas del proveedor autenticado, con su estado. */
class ListMyOffers {
  constructor({ offerRepository }) {
    this.offerRepository = offerRepository;
  }

  async execute(supplierId) {
    return this.offerRepository.findBySupplierId(supplierId);
  }
}

module.exports = { ListMyOffers };
