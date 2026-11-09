'use strict';

const { Op } = require('sequelize');
const { IPartRequestRepository } = require('../../domain/repositories/partRequestRepository');
const { PartRequest } = require('../../domain/entities/partRequest');

/**
 * Implementación PostgreSQL/Sequelize del contrato IPartRequestRepository.
 *
 * Es el ÚNICO archivo que sabe que existe Sequelize. Mapea modelo ↔ entidad:
 *   - modelo:   camelCase con columnas snake_case (field)
 *   - entidad:  camelCase puro (domain)
 */
class SequelizePartRequestRepository extends IPartRequestRepository {
  constructor(partRequestModel) {
    super();
    this.model = partRequestModel;
  }

  static toEntity(row) {
    if (!row) return null;
    // Sequelize expone los ATRIBUTOS en camelCase (userId, createdAt...);
    // snake_case es solo el nombre de la columna en la base.
    const r = row.get ? row.get({ plain: true }) : row;
    return new PartRequest({
      id: r.id,
      userId: r.userId,
      userEmail: r.userEmail,
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      vehicleBrand: r.vehicleBrand,
      vehicleModel: r.vehicleModel,
      vehicleYear: r.vehicleYear,
      description: r.description,
      city: r.city,
      urgency: r.urgency,
      status: r.status,
      photo: r.photo,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    });
  }

  async findById(id, { transaction } = {}) {
    const row = await this.model.findByPk(id, { transaction });
    return SequelizePartRequestRepository.toEntity(row);
  }

  /**
   * @param {Object} [filters]
   * @param {number} [filters.userId] Mis solicitudes (GET /mine)
   * @param {string[]} [filters.statuses] GET /open: PUBLISHED | RECEIVING_OFFERS
   * @param {string} [filters.city] Sin distinguir mayúsculas (docs/contratos-api.md)
   * @param {number} [filters.categoryId]
   */
  async findAll(filters = {}) {
    const where = {};
    if (filters.userId !== undefined) where.userId = filters.userId;
    if (filters.statuses) where.status = { [Op.in]: filters.statuses };
    else if (filters.status) where.status = filters.status;
    if (filters.urgency) where.urgency = filters.urgency;
    if (filters.categoryId !== undefined) where.categoryId = filters.categoryId;
    if (filters.city) where.city = { [Op.iLike]: filters.city };

    const rows = await this.model.findAll({ where, order: [['createdAt', 'DESC']] });
    return rows.map(SequelizePartRequestRepository.toEntity);
  }

  async save(partRequest, { transaction } = {}) {
    const data = {
      userId: partRequest.userId,
      userEmail: partRequest.userEmail,
      categoryId: partRequest.categoryId,
      categoryName: partRequest.categoryName,
      vehicleBrand: partRequest.vehicleBrand,
      vehicleModel: partRequest.vehicleModel,
      vehicleYear: partRequest.vehicleYear,
      description: partRequest.description,
      city: partRequest.city,
      urgency: partRequest.urgency,
      status: partRequest.status,
      photo: partRequest.photo,
    };

    if (partRequest.id == null) {
      const created = await this.model.create(data, { transaction });
      return SequelizePartRequestRepository.toEntity(created);
    }

    await this.model.update(data, { where: { id: partRequest.id }, transaction });
    return this.findById(partRequest.id, { transaction });
  }

  /**
   * Compare-and-swap de estado: `UPDATE ... SET status = newStatus
   * WHERE id = ? AND status = expectedStatus`.
   *
   * Es atómico en la base (misma idea que el SELECT ... FOR UPDATE de la
   * regla de una sola oferta aceptada): de dos PATCH simultáneos solo uno
   * ve `true`, así el perdedor no publica un evento fantasma.
   *
   * @returns {Promise<boolean>} true si esta escritura ganó
   */
  async updateStatusIfCurrent(id, expectedStatus, newStatus, { transaction } = {}) {
    const [affected] = await this.model.update(
      { status: newStatus },
      { where: { id, status: expectedStatus }, transaction }
    );
    return affected > 0;
  }
}

module.exports = { SequelizePartRequestRepository };
