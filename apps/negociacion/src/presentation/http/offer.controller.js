'use strict';

const { validateSubmitOfferDto, validateOffersSort } = require('./dto');

/**
 * Controller delgado (AGENTS.md §5): valida DTO → llama caso de uso →
 * responde. Sin lógica de negocio.
 */

/** Proyecta la entidad a la respuesta snake_case del contrato. */
function toOfferResponse(entity) {
  if (!entity) return null;
  return {
    id: entity.id,
    part_request_id: entity.partRequestId,
    supplier_id: entity.supplierId,
    supplier_name: entity.supplierName,
    price: entity.price,
    currency: entity.currency,
    brand: entity.brand,
    condition: entity.condition,
    availability: entity.availability,
    delivery_type: entity.deliveryType,
    estimated_days: entity.estimatedDays,
    notes: entity.notes,
    status: entity.status,
    created_at: entity.createdAt,
    updated_at: entity.updatedAt,
  };
}

function createOfferController({
  submitOffer,
  withdrawOffer,
  acceptOffer,
  listPartRequestOffers,
  listMyOffers,
  toPartRequestResponse,
}) {
  return {
    /** POST /api/v1/part-requests/:id/offers */
    submit: async (req, res, next) => {
      try {
        const data = validateSubmitOfferDto(req.body);
        const offer = await submitOffer.execute({
          partRequestId: Number(req.params.id),
          supplierId: req.user.id,
          data,
          correlationId: req.headers['x-correlation-id'],
        });
        res.status(201).json({ status: 201, msg: 'Oferta enviada', data: toOfferResponse(offer) });
      } catch (err) {
        next(err);
      }
    },

    /** GET /api/v1/part-requests/:id/offers?sort=price|days — comparador, dueño */
    listForPartRequest: async (req, res, next) => {
      try {
        const sort = validateOffersSort(req.query);
        const offers = await listPartRequestOffers.execute(Number(req.params.id), req.user.id, sort);
        res.status(200).json({ status: 200, msg: 'Ofertas encontradas', data: offers.map(toOfferResponse) });
      } catch (err) {
        next(err);
      }
    },

    /** GET /api/v1/offers/mine */
    mine: async (req, res, next) => {
      try {
        const offers = await listMyOffers.execute(req.user.id);
        res.status(200).json({ status: 200, msg: 'Ofertas encontradas', data: offers.map(toOfferResponse) });
      } catch (err) {
        next(err);
      }
    },

    /** PATCH /api/v1/offers/:id/withdraw */
    withdraw: async (req, res, next) => {
      try {
        const offer = await withdrawOffer.execute({ offerId: Number(req.params.id), actorId: req.user.id });
        res.status(200).json({ status: 200, msg: 'Oferta retirada', data: toOfferResponse(offer) });
      } catch (err) {
        next(err);
      }
    },

    /** POST /api/v1/offers/:id/accept — la operación crítica. Respuesta: { offer, part_request }. */
    accept: async (req, res, next) => {
      try {
        const { offer, partRequest } = await acceptOffer.execute({
          offerId: Number(req.params.id),
          actorId: req.user.id,
          correlationId: req.headers['x-correlation-id'],
        });
        res.status(200).json({
          status: 200,
          msg: 'Oferta aceptada',
          data: { offer: toOfferResponse(offer), part_request: toPartRequestResponse(partRequest) },
        });
      } catch (err) {
        next(err);
      }
    },
  };
}

module.exports = { createOfferController, toOfferResponse };
