'use strict';

const { ICategoryGateway } = require('../../application/ports/categoryGateway');
const { CategoryNotFoundException, CatalogUnavailableException } = require('../../domain/errors');

const TIMEOUT_MS = 3000;

/**
 * Implementación HTTP del puerto hacia Catálogo, con el `fetch` global de
 * Node 20 (AGENTS.md §9.7: no agregar una dependencia como axios si el
 * runtime ya trae lo necesario).
 *
 * Reenvía el JWT del usuario que hizo la petición original — nunca llama a
 * Catálogo sin token (skill express-backend).
 */
class CatalogHttpClient extends ICategoryGateway {
  constructor({ baseUrl }) {
    super();
    this.baseUrl = baseUrl;
  }

  async findById(categoryId, token) {
    let response;
    try {
      response = await fetch(`${this.baseUrl}/api/v1/categories/${categoryId}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      // Timeout, DNS, conexión rechazada: Catálogo no está disponible, no es
      // un error de Negociación (503, no 500).
      throw new CatalogUnavailableException();
    }

    if (response.status === 404) {
      throw new CategoryNotFoundException(categoryId);
    }
    if (!response.ok) {
      throw new CatalogUnavailableException();
    }

    const body = await response.json();
    return body.data;
  }
}

module.exports = { CatalogHttpClient };
