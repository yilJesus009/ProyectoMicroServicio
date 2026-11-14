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
   * `SELECT ... FOR SHARE`: bloquea la fila del proveedor hasta que termine
   * la transacción. La necesita SubmitOffer (AGENTS.md §4.1, mismo espíritu
   * que el lock de la solicitud): sin esto, un SUPPLIER_REJECTED concurrente
   * podría quitar la aprobación justo entre que se lee y se guarda la
   * oferta. Con el lock, uno de los dos espera al otro — nunca se cruzan.
   *
   * @param {Object} options @param {unknown} options.transaction Obligatorio
   */
  async lockBySupplierId(supplierId, options = {}) {
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
