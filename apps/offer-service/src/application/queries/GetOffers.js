'use strict';

const { AppError } = require('../../domain/errors/AppError');
const { requestOwnerId } = require('../commands/AcceptOffer');

class GetOffers {
  constructor({ offerRepository, requestClient }) {
    this.offers = offerRepository;
    this.requests = requestClient;
  }

  async byRequest({ requestId, actor, authorization }) {
    if (!actor.roles.includes('COMPRADOR') && !actor.roles.includes('ADMIN')) {
      throw new AppError('Solo un comprador puede consultar ofertas por solicitud', 403, 'FORBIDDEN');
    }
    const id = Number(requestId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new AppError('request_id debe ser un identificador válido', 400, 'INVALID_INPUT');
    }
    const request = await this.requests.findById(id, authorization);
    const ownerId = requestOwnerId(request);
    if (ownerId == null) {
      throw new AppError('Part Request Service no devolvió el propietario de la solicitud', 502, 'DEPENDENCY_ERROR');
    }
    if (!actor.roles.includes('ADMIN') && String(ownerId) !== String(actor.id)) {
      throw new AppError('Solo el propietario de la solicitud puede consultar sus ofertas', 403, 'FORBIDDEN');
    }
    return this.offers.findByRequestId(id);
  }

  async byProvider({ providerId, actor }) {
    if (!actor.roles.includes('PROVEEDOR') && !actor.roles.includes('ADMIN')) {
      throw new AppError('Solo un proveedor puede consultar sus ofertas', 403, 'FORBIDDEN');
    }
    const targetProviderId = providerId === undefined && !actor.roles.includes('ADMIN')
      ? actor.id
      : Number(providerId);
    if (!Number.isSafeInteger(Number(targetProviderId)) || Number(targetProviderId) <= 0) {
      throw new AppError('provider_id debe ser un identificador válido', 400, 'INVALID_INPUT');
    }
    if (!actor.roles.includes('ADMIN')
      && providerId !== undefined
      && String(providerId) !== String(actor.id)) {
      throw new AppError('Solo puedes consultar tus propias ofertas', 403, 'FORBIDDEN');
    }
    return this.offers.findByProviderId(targetProviderId);
  }

  async byId({ offerId, actor, authorization }) {
    const id = Number(offerId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new AppError('El identificador de oferta no es válido', 400, 'INVALID_INPUT');
    }
    const offer = await this.offers.findById(id);
    if (!offer) throw new AppError('Oferta no encontrada', 404, 'OFFER_NOT_FOUND');
    if (actor.roles.includes('ADMIN')) return offer;
    if (actor.roles.includes('PROVEEDOR') && String(offer.providerId) === String(actor.id)) return offer;
    if (!actor.roles.includes('COMPRADOR')) {
      throw new AppError('No tienes permiso para consultar esta oferta', 403, 'FORBIDDEN');
    }
    const request = await this.requests.findById(offer.requestId, authorization);
    const ownerId = requestOwnerId(request);
    if (ownerId == null) {
      throw new AppError('Part Request Service no devolvió el propietario de la solicitud', 502, 'DEPENDENCY_ERROR');
    }
    if (String(ownerId) !== String(actor.id)) {
      throw new AppError('No tienes permiso para consultar esta oferta', 403, 'FORBIDDEN');
    }
    return offer;
  }
}

module.exports = { GetOffers };
