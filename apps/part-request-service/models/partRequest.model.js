const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {

    return sequelize.define(
        "PartRequest",
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },

            userId: {
                type: DataTypes.INTEGER,
                allowNull: false
            },

            vehicleBrand: {
                type: DataTypes.STRING,
                allowNull: false
            },

            vehicleModel: {
                type: DataTypes.STRING,
                allowNull: false
            },

            vehicleYear: {
                type: DataTypes.INTEGER,
                allowNull: false
            },

            description: {
                type: DataTypes.TEXT,
                allowNull: false
            },

            city: {
                type: DataTypes.STRING,
                allowNull: false
            },

            urgency: {
                type: DataTypes.ENUM(
                    "BAJA",
                    "MEDIA",
                    "ALTA"
                ),
                defaultValue: "MEDIA"
            },

            status: {
                type: DataTypes.ENUM(
                    "PUBLISHED",
                    "IN_PROGRESS",
                    "COMPLETED",
                    "CANCELLED"
                ),
                defaultValue: "PUBLISHED"
            },

            photo: {
                type: DataTypes.STRING,
                allowNull: true
            }
        },
        {
            tableName: "part_requests",
            timestamps: true
        }
    );
};