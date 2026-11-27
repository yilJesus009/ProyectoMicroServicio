'use strict';

/**
 * Puerto hacia la atomicidad transaccional.
 *
 * `application/` no puede importar Sequelize (AGENTS.md §7): el caso de uso
 * solo conoce `run(fn)`. La implementación real (Sequelize) vive en
 * infrastructure/persistence/sequelizeUnitOfWork.js.
 *
 * El token que `run` pasa a `fn` es opaco para el caso de uso: solo lo
 * reenvía como `{ transaction }` a los repositorios (también puertos), que
 * sí saben qué hacer con él.
 */
class IUnitOfWork {
  /**
   * Ejecuta `fn(transactionToken)`. Si `fn` lanza, todo lo escrito con ese
   * token se revierte; si resuelve, se confirma.
   *
   * @param {(transactionToken: unknown) => Promise<any>} fn
   * @returns {Promise<any>} lo que resuelva `fn`
   */
  async run(fn) {
    throw new Error('not implemented');
  }
}

module.exports = { IUnitOfWork };
