'use strict';

/**
 * Errores de dominio.
 *
 * El errorHandler de presentation/ los mapea a HTTP por `error.name`:
 *
 *   ValidationException            → 400
 *   ForbiddenException             → 403
 *   NotificationNotFoundException  → 404
 *
 * Cualquier otro error → 500 sin exponer el stack trace.
 */

class ValidationException extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationException';
  }
}

class ForbiddenException extends Error {
  constructor(message) {
    super(message);
    this.name = 'ForbiddenException';
  }
}

class NotificationNotFoundException extends Error {
  constructor(id) {
    super(`El aviso ${id} no existe`);
    this.name = 'NotificationNotFoundException';
  }
}

module.exports = { ValidationException, ForbiddenException, NotificationNotFoundException };
