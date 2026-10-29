'use strict';

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

  async findById(id) {
    const row = await this.model.findByPk(id);
    return SequelizePartRequestRepository.toEntity(row);
  }

  async findAll(filters = {}) {
    const where = {};
    if (filters.city) where.city = filters.city;
    if (filters.status) where.status = filters.status;
    if (filters.urgency) where.urgency = filters.urgency;

    const rows = await this.model.findAll({ where, order: [['createdAt', 'DESC']] });
    return rows.map(SequelizePartRequestRepository.toEntity);
  }

  async save(partRequest) {
    const data = {
      userId: partRequest.userId,
      userEmail: partRequest.userEmail,
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
      const created = await this.model.create(data);
      return SequelizePartRequestRepository.toEntity(created);
    }

    await this.model.update(data, { where: { id: partRequest.id } });
    return this.findById(partRequest.id);
  }
}

module.exports = { SequelizePartRequestRepository };
