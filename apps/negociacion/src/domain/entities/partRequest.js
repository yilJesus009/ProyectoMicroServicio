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
    categoryId,
    categoryName,
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
    this.categoryId = categoryId;
    this.categoryName = categoryName;
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

  /** "Toyota Corolla 2018" — para el payload de eventos (docs/eventos.md). */
  get vehicleLabel() {
    return `${this.vehicleBrand} ${this.vehicleModel} ${this.vehicleYear}`;
  }

  /** Solo el dueño o un proveedor aprobado pueden ver el detalle/foto (docs/contratos-api.md). */
  canBeViewedBy(requesterId, isApprovedSupplier) {
    return this.userId === requesterId || isApprovedSupplier === true;
  }

  /**
   * Cambia el estado aplicando la máquina de transiciones.
   *
   * @param {string} newStatus Estado deseado (validado contra los enums)
   * @returns {string} El estado anterior (útil para el evento STATUS_CHANGED)
   * @throws {InvalidPartRequestTransitionException} si la transición no es legal
   */
  changeStatus(newStatus) {
    this.assertCanTransition(newStatus);
    const previous = this.status;
    this.status = newStatus;
    return previous;
  }

  /**
   * Valida la transición SIN cambiar el estado.
   *
   * Se usa antes del compare-and-swap del repositorio: primero se gana la
   * escritura en la base, después se muta la entidad. Si la validación
   * falla, no quedó nada escrito.
   *
   * @param {string} newStatus Estado deseado
   * @throws {InvalidPartRequestTransitionException} si la transición no es legal
   */
  assertCanTransition(newStatus) {
    if (!canTransition(this.status, newStatus)) {
      throw new InvalidPartRequestTransitionException(this.status, newStatus);
    }
  }
}

module.exports = { PartRequest };
