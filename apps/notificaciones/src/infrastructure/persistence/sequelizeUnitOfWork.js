'use strict';

const { IUnitOfWork } = require('../../application/ports/unitOfWork');

/** Implementación Sequelize del puerto IUnitOfWork. */
class SequelizeUnitOfWork extends IUnitOfWork {
  constructor(sequelize) {
    super();
    this.sequelize = sequelize;
  }

  async run(fn) {
    return this.sequelize.transaction(fn);
  }
}

module.exports = { SequelizeUnitOfWork };
