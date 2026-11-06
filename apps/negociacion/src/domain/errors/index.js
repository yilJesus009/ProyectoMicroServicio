'use strict';

/**
 * Errores de dominio.
 *
 * El errorHandler de presentation/ los mapea a HTTP por `error.name`:
 *
 *   ValidationException                    → 400
 *   ForbiddenException                     → 403
 *   PartRequestNotFoundException          → 404
 *   PartRequestStatusConflictException    → 409
 *   InvalidPartRequestTransitionException → 422
 *   EventDrivenStatusException            → 422
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

module.exports = {
  PartRequestNotFoundException,
  InvalidPartRequestTransitionException,
  PartRequestStatusConflictException,
  EventDrivenStatusException,
  ForbiddenException,
  ValidationException,
};
