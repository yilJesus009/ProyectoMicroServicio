'use strict';

/**
 * Contrato del repositorio.
 *
 * Interfaz, NO implementación: el dominio no sabe que hay Sequelize detrás.
 * La implementación vive en infrastructure/persistence/.
 */
class IPartRequestRepository {
  async findById(id) {
    throw new Error('not implemented');
  }

  async findAll(filters = {}) {
    throw new Error('not implemented');
  }

  async save(partRequest) {
    throw new Error('not implemented');
  }
}

module.exports = { IPartRequestRepository };
