const { sequelize, Sequelize } = require('../config/db.config');
const PartRequest = require('./partRequest.model')(sequelize);

module.exports = {
    PartRequest,
    sequelize,
    Sequelize
};