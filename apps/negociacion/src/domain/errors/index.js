'use strict';

/**
 * Errores de dominio.
 *
 * El errorHandler de presentation/ los mapea a HTTP por `error.name`:
 *
 *   ValidationException                    → 400
 *   CategoryNotFoundException              → 400
 *   ForbiddenException                     → 403
 *   PartRequestNotFoundException          → 404
 *   PartRequestPhotoNotFoundException     → 404
 *   PartRequestStatusConflictException    → 409
 *   InvalidPartRequestTransitionException → 422
 *   EventDrivenStatusException            → 422
 *   CategoryInactiveException             → 422
 *   CatalogUnavailableException           → 503
 *   OfferNotFoundException                → 404
 *   PartRequestNotAcceptingOffersException → 422
 *   InvalidOfferTransitionException       → 422
 *   ActiveOfferConflictException          → 409
 *   OfferAlreadyAcceptedException         → 409
 *
 * Cualquier otro error → 500 sin exponer el stack trace.
 */

class PartRequestNotFoundException extends Error {
  constructor(id) {
    super(`La solicitud ${id} no existe`);
    this.name = 'PartRequestNotFoundException';
  }
}

class InvalidPartRequestTransitionException extends Error {
  constructor(from, to) {
    super(`Transición de estado no permitida: ${from} → ${to}`);
    this.name = 'InvalidPartRequestTransitionException';
    this.from = from;
    this.to = to;
  }
}

class ForbiddenException extends Error {
  constructor(message) {
    super(message);
    this.name = 'ForbiddenException';
  }
}

class ValidationException extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationException';
  }
}

/**
 * Dos cambios de estado simultáneos para la misma solicitud: el
 * compare-and-swap del repositorio deja pasar solo a uno. El que pierde
 * recibe esto en vez de publicar un evento fantasma (409).
 */
class PartRequestStatusConflictException extends Error {
  constructor(id) {
    super(`La solicitud ${id} cambió de estado al mismo tiempo; vuelve a intentarlo`);
    this.name = 'PartRequestStatusConflictException';
    this.id = id;
  }
}

/**
 * Estado que este servicio NO acepta desde el cliente: lo asigna un
 * consumidor de eventos (docs/arquitectura.md: part-request pasa a
 * ORDERED al recibir OFFER_ACCEPTED).
 */
class EventDrivenStatusException extends Error {
  constructor(status, eventName) {
    super(`El estado ${status} lo asigna el evento ${eventName}, no una petición del cliente`);
    this.name = 'EventDrivenStatusException';
    this.status = status;
    this.eventName = eventName;
  }
}

/** category_id no existe en Catálogo. */
class CategoryNotFoundException extends Error {
  constructor(categoryId) {
    super(`La categoría ${categoryId} no existe`);
    this.name = 'CategoryNotFoundException';
  }
}

/** category_id existe pero está desactivada (Catálogo: active = false). */
class CategoryInactiveException extends Error {
  constructor(categoryId) {
    super(`La categoría ${categoryId} está desactivada`);
    this.name = 'CategoryInactiveException';
  }
}

/** Catálogo no respondió o falló: no es un 500 de Negociación, es una dependencia caída. */
class CatalogUnavailableException extends Error {
  constructor() {
    super('Catálogo no disponible');
    this.name = 'CatalogUnavailableException';
  }
}

/** La solicitud no tiene foto, o no existe el archivo. */
class PartRequestPhotoNotFoundException extends Error {
  constructor(id) {
    super(`La solicitud ${id} no tiene fotografía`);
    this.name = 'PartRequestPhotoNotFoundException';
  }
}

/** La oferta no existe. */
class OfferNotFoundException extends Error {
  constructor(id) {
    super(`La oferta ${id} no existe`);
    this.name = 'OfferNotFoundException';
  }
}

/** La solicitud no está PUBLISHED ni RECEIVING_OFFERS: no se puede ofertar ni retirar. */
class PartRequestNotAcceptingOffersException extends Error {
  constructor(partRequestId, status) {
    super(`La solicitud ${partRequestId} no acepta ofertas en su estado actual (${status})`);
    this.name = 'PartRequestNotAcceptingOffersException';
  }
}

/** Transición de oferta no permitida (p.ej. aceptar una ya retirada). */
class InvalidOfferTransitionException extends Error {
  constructor(offerId, from, to) {
    super(`La oferta ${offerId} no puede pasar de ${from} a ${to}`);
    this.name = 'InvalidOfferTransitionException';
  }
}

/** El proveedor ya tiene una oferta activa (SUBMITTED) en esta solicitud. */
class ActiveOfferConflictException extends Error {
  constructor(partRequestId) {
    super(`Ya tienes una oferta activa en la solicitud ${partRequestId}`);
    this.name = 'ActiveOfferConflictException';
  }
}

/** La solicitud ya tiene otra oferta ACCEPTED (segunda aceptación). */
class OfferAlreadyAcceptedException extends Error {
  constructor(partRequestId) {
    super(`La solicitud ${partRequestId} ya tiene una oferta aceptada`);
    this.name = 'OfferAlreadyAcceptedException';
  }
}

module.exports = {
  PartRequestNotFoundException,
  InvalidPartRequestTransitionException,
  PartRequestStatusConflictException,
  EventDrivenStatusException,
  ForbiddenException,
  ValidationException,
  CategoryNotFoundException,
  CategoryInactiveException,
  CatalogUnavailableException,
  PartRequestPhotoNotFoundException,
  OfferNotFoundException,
  PartRequestNotAcceptingOffersException,
  InvalidOfferTransitionException,
  ActiveOfferConflictException,
  OfferAlreadyAcceptedException,
};
