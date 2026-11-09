'use strict';

/**
 * Contrato del repositorio.
 *
 * Interfaz, NO implementación: el dominio no sabe que hay Sequelize detrás.
 * La implementación vive en infrastructure/persistence/.
 */
class IPartRequestRepository {
  /** @param {Object} [options] @param {unknown} [options.transaction] */
  async findById(id, options = {}) {
    throw new Error('not implemented');
  }

  async findAll(filters = {}) {
    throw new Error('not implemented');
  }

  /** @param {Object} [options] @param {unknown} [options.transaction] */
  async save(partRequest, options = {}) {
    throw new Error('not implemented');
  }

  /**
   * Compare-and-swap de estado (defensa contra escrituras concurrentes).
   *
   * `UPDATE ... SET status = newStatus WHERE id = ? AND status = expected`
   * es atómico en la base: de dos PATCH simultáneos solo uno ve `true`.
   * El que pierde NO debe publicar evento (el historial quedaría mentido).
   *
   * @param {number} id Id de la solicitud
   * @param {string} expectedStatus Estado que se leyó al empezar
   * @param {string} newStatus Estado nuevo
   * @param {Object} [options] @param {unknown} [options.transaction]
   * @returns {Promise<boolean>} true si esta escritura ganó
   */
  async updateStatusIfCurrent(id, expectedStatus, newStatus, options = {}) {
    throw new Error('not implemented');
  }

  /**
   * `SELECT ... FOR UPDATE`: bloquea la fila hasta que termine la
   * transacción. Lo usan enviar, retirar y aceptar oferta (AGENTS.md §4.1,
   * la regla crítica) para que ninguna de las tres pise a otra sobre la
   * misma solicitud.
   *
   * @param {Object} options @param {unknown} options.transaction Obligatorio
   */
  async lockById(id, options = {}) {
    throw new Error('not implemented');
  }
}

module.exports = { IPartRequestRepository };
