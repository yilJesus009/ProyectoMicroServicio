'use strict';

/**
 * Errores de dominio.
 *
 * El errorHandler de presentation/ los mapea a HTTP por `error.name`:
 *
 *   ValidationException                    → 400
 *   ForbiddenException                     → 403
 *   PartRequestNotFoundException          → 404
 *   InvalidPartRequestTransitionException → 422
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

module.exports = {
  PartRequestNotFoundException,
  InvalidPartRequestTransitionException,
  ForbiddenException,
  ValidationException,
};
