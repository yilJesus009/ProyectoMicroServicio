'use strict';

const { AppError } = require('../../domain/errors/AppError');

class PartRequestHttpClient {
  constructor({ baseUrl = process.env.PART_REQUEST_SERVICE_URL } = {}) {
    if (!baseUrl) throw new Error('PART_REQUEST_SERVICE_URL debe estar configurada');
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async findById(id, authorization) {
    const headers = authorization ? { authorization } : {};
    let response;
    try {
      response = await fetch(`${this.baseUrl}/api/v1/part-requests/${encodeURIComponent(id)}`, {
        headers,
        signal: AbortSignal.timeout(5000),
      });
      if (response.status === 404) {
        response = await fetch(`${this.baseUrl}/api/requests/${encodeURIComponent(id)}`, {
          headers,
          signal: AbortSignal.timeout(5000),
        });
      }
    } catch {
      throw new AppError('Part Request Service no está disponible', 503, 'DEPENDENCY_UNAVAILABLE');
    }
    if (response.status === 404) {
      throw new AppError('La solicitud no existe', 404, 'PART_REQUEST_NOT_FOUND');
    }
    if (!response.ok) {
      throw new AppError('No se pudo validar la solicitud', 502, 'DEPENDENCY_ERROR');
    }
    let body;
    try {
      body = await response.json();
    } catch {
      throw new AppError('Part Request Service devolvió una respuesta inválida', 502, 'DEPENDENCY_ERROR');
    }
    const request = body && Object.prototype.hasOwnProperty.call(body, 'data') ? body.data : body;
    if (!request || typeof request !== 'object') {
      throw new AppError('Part Request Service devolvió una respuesta inválida', 502, 'DEPENDENCY_ERROR');
    }
    if (typeof (request.status ?? request.state ?? request.estado) !== 'string') {
      throw new AppError('Part Request Service no devolvió el estado de la solicitud', 502, 'DEPENDENCY_ERROR');
    }
    return request;
  }
}

module.exports = { PartRequestHttpClient };
