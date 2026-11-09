'use strict';

const { ISupplierRepository } = require('../../domain/repositories/supplierRepository');
const { Supplier } = require('../../domain/entities/supplier');

/** Implementación PostgreSQL/Sequelize del contrato ISupplierRepository. */
class SequelizeSupplierRepository extends ISupplierRepository {
  constructor(supplierModel) {
    super();
    this.model = supplierModel;
  }

  static toEntity(row) {
    if (!row) return null;
    const r = row.get ? row.get({ plain: true }) : row;
    return new Supplier({
      supplierId: r.supplierId,
      businessName: r.businessName,
      city: r.city,
      categoryIds: r.categoryIds,
      approved: r.approved,
      updatedAt: r.updatedAt,
    });
  }

  async findBySupplierId(supplierId, { transaction } = {}) {
    const row = await this.model.findByPk(supplierId, { transaction });
    return SequelizeSupplierRepository.toEntity(row);
  }

  async upsert(supplier, { transaction } = {}) {
    await this.model.upsert(
      {
        supplierId: supplier.supplierId,
        businessName: supplier.businessName,
        city: supplier.city,
        categoryIds: supplier.categoryIds,
        approved: supplier.approved,
      },
      { transaction }
    );
  }

  async removeBySupplierId(supplierId, { transaction } = {}) {
    await this.model.destroy({ where: { supplierId }, transaction });
  }
}

module.exports = { SequelizeSupplierRepository };
