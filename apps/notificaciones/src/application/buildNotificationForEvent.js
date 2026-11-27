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

    case 'ORDER_STATUS_CHANGED':
      return buildOrderStatusChangedNotification(payload);

    default:
      return null;
  }
}

/**
 * ORDER_STATUS_CHANGED: el destinatario depende de QUIÉN hizo el cambio,
 * y eso ya lo fija la máquina de estados de Pedidos (docs/flujo-principal.md):
 * pagar (PENDING_PAYMENT → PREPARING) y confirmar recepción
 * (DELIVERED → COMPLETED) los hace el comprador → avisa al proveedor;
 * cualquier otro avance lo hace el proveedor → avisa al comprador. No hace
 * falta leer `changed_by`.
 *
 * El aviso de DELIVERED pide la acción explícitamente (ajuste del equipo,
 * 2026-11-10): es el único paso donde el comprador tiene que hacer algo
 * (confirmar recepción) para que la solicitud llegue a COMPLETED.
 */
function buildOrderStatusChangedNotification(payload) {
  const { order_id: orderId, previous_status: previousStatus, new_status: newStatus, buyer_id: buyerId, supplier_id: supplierId } = payload;

  if (previousStatus === 'PENDING_PAYMENT' && newStatus === 'PREPARING') {
    return {
      userId: supplierId,
      title: 'Pedido pagado',
      message: `El comprador pagó el pedido #${orderId}: prepáralo.`,
      link: '/proveedor/pedidos',
    };
  }

  if (newStatus === 'IN_TRANSIT') {
    return {
      userId: buyerId,
      title: 'Pedido en camino',
      message: `Tu pedido #${orderId} va en camino.`,
      link: `/comprador/pedidos/${orderId}`,
    };
  }

  if (newStatus === 'READY_FOR_PICKUP') {
    return {
      userId: buyerId,
      title: 'Pedido listo para retirar',
      message: `Tu pedido #${orderId} está listo para retirar.`,
      link: `/comprador/pedidos/${orderId}`,
    };
  }

  if (newStatus === 'DELIVERED') {
    return {
      userId: buyerId,
      title: 'Pedido entregado',
      message: `Tu pedido #${orderId} fue entregado. Confírmalo para cerrar la compra.`,
      link: `/comprador/pedidos/${orderId}`,
    };
  }

  if (newStatus === 'COMPLETED') {
    return {
      userId: supplierId,
      title: 'Recepción confirmada',
      message: `El comprador confirmó la recepción del pedido #${orderId}.`,
      link: '/proveedor/pedidos',
    };
  }

  return null;
}

module.exports = { buildNotificationForEvent };
