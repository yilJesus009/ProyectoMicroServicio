'use strict';

const { Op } = require('sequelize');
const { OutboxEventModel } = require('./models');

class OutboxRepository {
  async add({ topic, routingKey, message }, transaction) {
    return OutboxEventModel.create({ topic, routingKey, message }, { transaction });
  }

  async dispatchBatch(publisher, logger = console) {
    return OutboxEventModel.sequelize.transaction(async (transaction) => {
      const events = await OutboxEventModel.findAll({
        where: {
          publishedAt: null,
          nextAttemptAt: { [Op.lte]: new Date() },
        },
        order: [['createdAt', 'ASC']],
        limit: 20,
        transaction,
        lock: transaction.LOCK.UPDATE,
        skipLocked: true,
      });

      for (const event of events) {
        try {
          await publisher.publish(event.topic, event.routingKey, event.message);
          await event.update({ publishedAt: new Date() }, { transaction });
        } catch (error) {
          const attempts = event.attempts + 1;
          const delay = Math.min(1000 * (2 ** Math.min(attempts, 6)), 60000);
          await event.update({ attempts, nextAttemptAt: new Date(Date.now() + delay) }, { transaction });
          logger.error('No se pudo publicar evento del outbox', {
            eventId: event.id,
            routingKey: event.routingKey,
            error: error.message,
          });
        }
      }
      return events.length;
    });
  }
}

module.exports = { OutboxRepository };
