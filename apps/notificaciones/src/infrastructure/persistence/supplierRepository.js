'use strict';

const { Op } = require('sequelize');
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
    return new Supplier({ supplierId: r.supplierId, city: r.city, categoryIds: r.categoryIds, approved: r.approved });
  }

  async upsert(supplier, { transaction } = {}) {
    await this.model.upsert(
      { supplierId: supplier.supplierId, city: supplier.city, categoryIds: supplier.categoryIds, approved: supplier.approved },
      { transaction }
    );
  }

  async removeBySupplierId(supplierId, { transaction } = {}) {
    await this.model.destroy({ where: { supplierId }, transaction });
  }

  /** Ciudad sin distinguir mayúsculas; category_id dentro del arreglo category_ids. */
  async findApprovedByCityAndCategory(city, categoryId, { transaction } = {}) {
    const rows = await this.model.findAll({
      where: {
        approved: true,
        city: { [Op.iLike]: city },
        categoryIds: { [Op.contains]: [categoryId] },
      },
      transaction,
    });
    return rows.map(SequelizeSupplierRepository.toEntity);
  }
}

module.exports = { SequelizeSupplierRepository };
