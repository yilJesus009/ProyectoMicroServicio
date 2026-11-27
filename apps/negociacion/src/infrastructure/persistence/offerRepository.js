'use strict';

const { Op } = require('sequelize');
const { IOfferRepository } = require('../../domain/repositories/offerRepository');
const { Offer } = require('../../domain/entities/offer');
const { OfferStatus } = require('../../domain/enums');

/** Implementación PostgreSQL/Sequelize del contrato IOfferRepository. */
class SequelizeOfferRepository extends IOfferRepository {
  constructor(offerModel) {
    super();
    this.model = offerModel;
  }

  static toEntity(row) {
    if (!row) return null;
    const r = row.get ? row.get({ plain: true }) : row;
    return new Offer({
      id: r.id,
      partRequestId: r.partRequestId,
      supplierId: r.supplierId,
      supplierName: r.supplierName,
      price: Number(r.price),
      currency: r.currency,
      brand: r.brand,
      condition: r.condition,
      availability: r.availability,
      deliveryType: r.deliveryType,
      estimatedDays: r.estimatedDays,
      notes: r.notes,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    });
  }

  async findById(id, { transaction } = {}) {
    const row = await this.model.findByPk(id, { transaction });
    return SequelizeOfferRepository.toEntity(row);
  }

  async findByPartRequestId(partRequestId, { sort } = {}) {
    const order = sort === 'days' ? [['estimatedDays', 'ASC']] : sort === 'price' ? [['price', 'ASC']] : [['createdAt', 'ASC']];
    const rows = await this.model.findAll({ where: { partRequestId }, order });
    return rows.map(SequelizeOfferRepository.toEntity);
  }

  async findBySupplierId(supplierId) {
    const rows = await this.model.findAll({ where: { supplierId }, order: [['createdAt', 'DESC']] });
    return rows.map(SequelizeOfferRepository.toEntity);
  }

  async findActiveBySupplierAndRequest(supplierId, partRequestId, { transaction } = {}) {
    const row = await this.model.findOne({
      where: { supplierId, partRequestId, status: OfferStatus.SUBMITTED },
      transaction,
    });
    return SequelizeOfferRepository.toEntity(row);
  }

  async findAcceptedByPartRequestId(partRequestId, { transaction } = {}) {
    const row = await this.model.findOne({
      where: { partRequestId, status: OfferStatus.ACCEPTED },
      transaction,
    });
    return SequelizeOfferRepository.toEntity(row);
  }

  async save(offer, { transaction } = {}) {
    const data = {
      partRequestId: offer.partRequestId,
      supplierId: offer.supplierId,
      supplierName: offer.supplierName,
      price: offer.price,
      currency: offer.currency,
      brand: offer.brand,
      condition: offer.condition,
      availability: offer.availability,
      deliveryType: offer.deliveryType,
      estimatedDays: offer.estimatedDays,
      notes: offer.notes,
      status: offer.status,
    };

    if (offer.id == null) {
      const created = await this.model.create(data, { transaction });
      return SequelizeOfferRepository.toEntity(created);
    }

    await this.model.update(data, { where: { id: offer.id }, transaction });
    return this.findById(offer.id, { transaction });
  }

  async rejectOthersSubmitted(partRequestId, acceptedOfferId, { transaction } = {}) {
    const [, rows] = await this.model.update(
      { status: OfferStatus.REJECTED },
      {
        where: { partRequestId, status: OfferStatus.SUBMITTED, id: { [Op.ne]: acceptedOfferId } },
        transaction,
        returning: true,
      }
    );
    return rows.map(SequelizeOfferRepository.toEntity);
  }
}

module.exports = { SequelizeOfferRepository };
