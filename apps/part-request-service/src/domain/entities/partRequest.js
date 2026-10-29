'use strict';

const { PartRequestStatus, Urgency, canTransition } = require('../enums');
const { InvalidPartRequestTransitionException } = require('../errors');

/**
 * Entidad PartRequest.
 *
 * Vive en domain/: no conoce Express, Sequelize ni RabbitMQ.
 * La regla de negocio (máquina de transiciones) vive AQUÍ, no en el controller.
 */
class PartRequest {
  constructor({
    id = null,
    userId,
    userEmail = null,
    vehicleBrand,
    vehicleModel,
    vehicleYear,
    description,
    city,
    urgency,
    status,
    photo = null,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.userId = userId;
    this.userEmail = userEmail;
    this.vehicleBrand = vehicleBrand;
    this.vehicleModel = vehicleModel;
    this.vehicleYear = vehicleYear;
    this.description = description;
    this.city = city;
    this.urgency = urgency ?? Urgency.MEDIA;
    this.status = status ?? PartRequestStatus.PUBLISHED;
    this.photo = photo;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Cambia el estado aplicando la máquina de transiciones.
   *
   * @param {string} newStatus Estado deseado (validado contra los enums)
   * @returns {string} El estado anterior (útil para el evento STATUS_CHANGED)
   * @throws {InvalidPartRequestTransitionException} si la transición no es legal
   */
  changeStatus(newStatus) {
    if (!canTransition(this.status, newStatus)) {
      throw new InvalidPartRequestTransitionException(this.status, newStatus);
    }
    const previous = this.status;
    this.status = newStatus;
    return previous;
  }
}

module.exports = { PartRequest };
