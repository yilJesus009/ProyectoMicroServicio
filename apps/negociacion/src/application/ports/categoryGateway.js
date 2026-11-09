'use strict';

/**
 * Puerto hacia Catálogo (HTTP). Interfaz, NO implementación: vive en
 * infrastructure/http/catalogHttpClient.js (skill express-backend:
 * "Consumir HTTP de otro servicio").
 */
class ICategoryGateway {
  /**
   * @param {number} categoryId
   * @param {string} token JWT del usuario autenticado (se reenvía, nunca se llama sin token)
   * @returns {Promise<{id: number, name: string, active: boolean}>}
   * @throws {import('../../domain/errors').CategoryNotFoundException} si Catálogo responde 404
   * @throws {import('../../domain/errors').CatalogUnavailableException} si no responde o falla
   */
  async findById(categoryId, token) {
    throw new Error('not implemented');
  }
}

module.exports = { ICategoryGateway };
