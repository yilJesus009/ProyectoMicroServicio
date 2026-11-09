'use strict';

const { IProcessedEventRepository } = require('../../domain/repositories/processedEventRepository');

/** Implementación PostgreSQL/Sequelize del contrato IProcessedEventRepository. */
class SequelizeProcessedEventRepository extends IProcessedEventRepository {
  constructor(processedEventModel) {
    super();
    this.model = processedEventModel;
  }

  async isProcessed(eventId, { transaction } = {}) {
    const row = await this.model.findByPk(eventId, { transaction });
    return row !== null;
  }

  async markProcessed(eventId, eventName, { transaction } = {}) {
    await this.model.create({ eventId, eventName }, { transaction });
  }
}

module.exports = { SequelizeProcessedEventRepository };
