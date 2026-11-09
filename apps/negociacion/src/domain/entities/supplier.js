'use strict';

/**
 * Copia local de un proveedor (docs/modelo-datos.md: tabla `suppliers`),
 * alimentada por los eventos de Identidad. `supplierId` es el `user_id`
 * del proveedor (el mismo del JWT) — nunca el id del perfil comercial.
 *
 * Vive en domain/: sin decoradores ni imports de Sequelize.
 */
class Supplier {
  constructor({
    supplierId,
    businessName = null,
    city = null,
    categoryIds = [],
    approved = false,
    updatedAt = null,
  }) {
    this.supplierId = supplierId;
    this.businessName = businessName;
    this.city = city;
    this.categoryIds = categoryIds;
    this.approved = approved;
    this.updatedAt = updatedAt;
  }

  /** SUPPLIER_PROFILE_SUBMITTED: queda sin aprobar hasta un nuevo SUPPLIER_APPROVED. */
  static submitted(supplierId, businessName) {
    return new Supplier({ supplierId, businessName, approved: false });
  }

  /** SUPPLIER_APPROVED: aprobado con los datos que trae el evento. */
  static approved(supplierId, businessName, city, categoryIds) {
    return new Supplier({ supplierId, businessName, city, categoryIds, approved: true });
  }
}

module.exports = { Supplier };
