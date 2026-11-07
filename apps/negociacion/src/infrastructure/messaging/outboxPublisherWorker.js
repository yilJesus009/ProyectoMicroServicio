'use strict';

/**
 * Publica el outbox cada 1-2 segundos, con confirmación de RabbitMQ
 * (docs/eventos.md). Si un evento falla, queda pendiente (published_at
 * sigue nulo) y se reintenta en el siguiente ciclo; los demás no se ven
 * afectados.
 *
 * Procesa los pendientes de UNO en UNO, en el orden en que
 * `outboxRepository.findUnpublished` los devuelve (creación ascendente):
 * nunca en paralelo, para no publicar un evento más nuevo antes que uno
 * más viejo.
 *
 * @param {Object} deps
 * @param {import('../../domain/repositories/outboxRepository').IOutboxRepository} deps.outboxRepository
 * @param {{ publishConfirmed(exchange: string, routingKey: string, envelope: Object): Promise<void> }} deps.eventPublisher
 * @param {number} [deps.intervalMs]
 * @param {number} [deps.batchSize]
 * @returns {{ stop(): void }}
 */
function startOutboxPublisherWorker({
  outboxRepository,
  eventPublisher,
  intervalMs = 1500,
  batchSize = 20,
}) {
  let stopped = false;
  let timer = null;

  async function tick() {
    if (stopped) return;
    try {
      const pending = await outboxRepository.findUnpublished(batchSize);
      for (const event of pending) {
        try {
          await eventPublisher.publishConfirmed(event.exchange, event.routingKey, event.payload);
          await outboxRepository.markPublished(event.id);
        } catch (error) {
          await outboxRepository.incrementAttempts(event.id);
          console.error(
            `[outbox] no se pudo publicar ${event.id} (${event.payload?.event_name}):`,
            error.message
          );
        }
      }
    } catch (error) {
      console.error('[outbox] error leyendo pendientes:', error.message);
    } finally {
      if (!stopped) timer = setTimeout(tick, intervalMs);
    }
  }

  timer = setTimeout(tick, intervalMs);

  return {
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}

module.exports = { startOutboxPublisherWorker };
