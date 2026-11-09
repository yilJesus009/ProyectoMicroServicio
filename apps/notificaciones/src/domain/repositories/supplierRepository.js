'use strict';

/**
 * Contrato del repositorio de la copia local de proveedores aprobados.
 * Interfaz, NO implementación: vive en infrastructure/persistence/.
 */
class ISupplierRepository {
  /** @param {Object} [options] @param {unknown} [options.transaction] */
  async upsert(supplier, options = {}) {
    throw new Error('not implemented');
  }

  async removeBySupplierId(supplierId, options = {}) {
    throw new Error('not implemented');
  }

  /**
   * Proveedores aprobados de esa ciudad (sin distinguir mayúsculas) que
   * atienden esa categoría (docs/plan/fase-2.md, ajuste del equipo).
   * @returns {Promise<Supplier[]>}
   */
  async findApprovedByCityAndCategory(city, categoryId, options = {}) {
    throw new Error('not implemented');
  }
}

module.exports = { ISupplierRepository };
