'use strict';

/**
 * Contrato del repositorio de la copia local de proveedores.
 * Interfaz, NO implementación: vive en infrastructure/persistence/.
 */
class ISupplierRepository {
  /** @param {Object} [options] @param {unknown} [options.transaction] */
  async findBySupplierId(supplierId, options = {}) {
    throw new Error('not implemented');
  }

  /**
   * Inserta o reemplaza la fila completa del proveedor (submitted/approved).
   * @param {import('../entities/supplier').Supplier} supplier
   * @param {Object} [options] @param {unknown} [options.transaction]
   */
  async upsert(supplier, options = {}) {
    throw new Error('not implemented');
  }

  /** SUPPLIER_REJECTED: quita al proveedor de la copia local. */
  async removeBySupplierId(supplierId, options = {}) {
    throw new Error('not implemented');
  }
}

module.exports = { ISupplierRepository };
