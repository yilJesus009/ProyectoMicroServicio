'use strict';

/**
 * Copia local de un proveedor aprobado (docs/modelo-datos.md: tabla
 * `suppliers`), alimentada por los eventos de Identidad. `supplierId` es
 * el `user_id` del proveedor (el mismo del JWT). Se usa solo para enrutar
 * `PART_REQUEST_CREATED` a los proveedores aprobados de la categoría y
 * ciudad correctas — no guarda el nombre comercial (eso lo usa Negociación).
 */
class Supplier {
  constructor({ supplierId, city = null, categoryIds = [], approved = false }) {
    this.supplierId = supplierId;
    this.city = city;
    this.categoryIds = categoryIds;
    this.approved = approved;
  }

  static approved(supplierId, city, categoryIds) {
    return new Supplier({ supplierId, city, categoryIds, approved: true });
  }
}

module.exports = { Supplier };
