'use strict';

/**
 * Arma el aviso para los eventos de UN solo destinatario fijo. Función
 * pura (sin repositorios): fácil de probar. `PART_REQUEST_CREATED` queda
 * afuera porque sus destinatarios salen de una consulta (proveedores
 * aprobados de esa ciudad y categoría) — lo arma `applyNegotiationEvent.js`.
 *
 * @param {string} eventName
 * @param {Object} payload
 * @returns {{userId?: number, role?: string, title: string, message: string, link: string}|null}
 *   null si el evento no genera aviso (no debería pasar: el consumidor solo
 *   bindea los 7 eventos documentados).
 */
function buildNotificationForEvent(eventName, payload) {
  switch (eventName) {
    case 'SUPPLIER_PROFILE_SUBMITTED':
      return {
        role: 'ADMIN',
        title: 'Nuevo proveedor por revisar',
        message: `${payload.business_name} envió su perfil comercial para revisión.`,
        link: '/admin/proveedores',
      };

    case 'SUPPLIER_APPROVED':
      return {
        userId: payload.supplier_id,
        title: 'Perfil aprobado',
        message: `Tu perfil comercial (${payload.business_name}) fue aprobado.`,
        link: '/proveedor/perfil',
      };

    case 'SUPPLIER_REJECTED':
      return {
        userId: payload.supplier_id,
        title: 'Perfil rechazado',
        message: `Tu perfil comercial fue rechazado: ${payload.reason}`,
        link: '/proveedor/perfil',
      };

    case 'OFFER_SUBMITTED':
      return {
        userId: payload.buyer_id,
        title: 'Nueva oferta recibida',
        message: `Nueva oferta de ${payload.supplier_name}: ${payload.price} ${payload.currency}`,
        link: `/comprador/solicitudes/${payload.part_request_id}`,
      };

    case 'OFFER_ACCEPTED':
      return {
        userId: payload.supplier_id,
        title: '¡Oferta aceptada!',
        message: `Tu oferta de ${payload.price} ${payload.currency} fue aceptada.`,
        link: '/proveedor/ofertas',
      };

    case 'OFFER_REJECTED':
      return {
        userId: payload.supplier_id,
        title: 'Oferta no seleccionada',
        message: 'El comprador eligió otra oferta para esta solicitud.',
        link: '/proveedor/ofertas',
      };

    default:
      return null;
  }
}

module.exports = { buildNotificationForEvent };
