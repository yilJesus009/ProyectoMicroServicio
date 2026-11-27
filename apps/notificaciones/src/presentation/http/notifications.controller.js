'use strict';

/** Controller delgado (AGENTS.md §5): valida entrada → llama query → responde. */

/** Proyecta la entidad a la respuesta snake_case del contrato. */
function toResponse(entity) {
  return {
    id: entity.id,
    type: entity.type,
    title: entity.title,
    message: entity.message,
    link: entity.link,
    read: entity.isRead,
    created_at: entity.createdAt,
  };
}

function createNotificationsController({
  listMyNotifications,
  countUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
}) {
  return {
    /** GET /api/v1/notifications/mine?unread=true */
    mine: async (req, res, next) => {
      try {
        const unreadOnly = req.query.unread === 'true';
        const notifications = await listMyNotifications.execute({
          userId: req.user.id,
          role: req.user.rol,
          unreadOnly,
        });
        res.status(200).json({
          status: 200,
          msg: 'Avisos encontrados',
          data: notifications.map(toResponse),
        });
      } catch (err) {
        next(err);
      }
    },

    /** GET /api/v1/notifications/unread-count */
    unreadCount: async (req, res, next) => {
      try {
        const count = await countUnreadNotifications.execute({
          userId: req.user.id,
          role: req.user.rol,
        });
        res.status(200).json({ status: 200, msg: 'Conteo de avisos sin leer', data: { count } });
      } catch (err) {
        next(err);
      }
    },

    /** PATCH /api/v1/notifications/:id/read */
    read: async (req, res, next) => {
      try {
        const notification = await markNotificationRead.execute({
          id: Number(req.params.id),
          userId: req.user.id,
          role: req.user.rol,
        });
        res.status(200).json({ status: 200, msg: 'Aviso marcado como leído', data: toResponse(notification) });
      } catch (err) {
        next(err);
      }
    },

    /** PATCH /api/v1/notifications/read-all */
    readAll: async (req, res, next) => {
      try {
        const count = await markAllNotificationsRead.execute({ userId: req.user.id, role: req.user.rol });
        res.status(200).json({ status: 200, msg: 'Avisos marcados como leídos', data: { count } });
      } catch (err) {
        next(err);
      }
    },
  };
}

module.exports = { createNotificationsController, toResponse };
