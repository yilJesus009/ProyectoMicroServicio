'use strict';

const { OfferStatus } = require('../../domain/enums');
const {
  OfferNotFoundException,
  PartRequestNotFoundException,
  ForbiddenException,
  PartRequestNotAcceptingOffersException,
} = require('../../domain/errors');

/**
 * Caso de uso: un proveedor retira su propia oferta.
 *
 * Misma regla que enviar y aceptar: bloquea la solicitud primero
 * (AGENTS.md §4.1), así no se retira una oferta justo mientras se acepta
 * otra de la misma solicitud.
 */
class WithdrawOffer {
  constructor({ partRequestRepository, offerRepository, unitOfWork }) {
    this.partRequestRepository = partRequestRepository;
    this.offerRepository = offerRepository;
    this.unitOfWork = unitOfWork;
  }

  /**
   * @param {Object} params @param {number} params.offerId @param {number} params.actorId Del JWT
   */
  async execute({ offerId, actorId }) {
    const existing = await this.offerRepository.findById(offerId);
    if (!existing) throw new OfferNotFoundException(offerId);

    return this.unitOfWork.run(async (transaction) => {
      const partRequest = await this.partRequestRepository.lockById(existing.partRequestId, { transaction });
      if (!partRequest) throw new PartRequestNotFoundException(existing.partRequestId);

      // Relee la oferta con el lock de la solicitud ya tomado.
      const offer = await this.offerRepository.findById(offerId, { transaction });
      if (!offer.isOwnedBy(actorId)) {
        throw new ForbiddenException('Solo el proveedor dueño puede retirar su oferta');
      }

      // docs/contratos-api.md: "Solo si SUBMITTED y la solicitud sigue abierta".
      if (!partRequest.acceptsOffers()) {
        throw new PartRequestNotAcceptingOffersException(partRequest.id, partRequest.status);
      }
      offer.assertCanTransition(OfferStatus.WITHDRAWN);

      offer.changeStatus(OfferStatus.WITHDRAWN);
      return this.offerRepository.save(offer, { transaction });
    });
  }
}

module.exports = { WithdrawOffer };
