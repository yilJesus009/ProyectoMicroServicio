'use strict';

class OutboxDispatcher {
  constructor({ repository, publisher, intervalMs = Number(process.env.OFFER_OUTBOX_POLL_INTERVAL_MS || 1000) }) {
    this.repository = repository;
    this.publisher = publisher;
    this.intervalMs = intervalMs;
    this.running = false;
  }

  start() {
    const dispatch = async () => {
      if (this.running) return;
      this.running = true;
      try {
        await this.repository.dispatchBatch(this.publisher);
      } catch (error) {
        console.error('Error procesando outbox de offer-service:', error.message);
      } finally {
        this.running = false;
      }
    };
    this.timer = setInterval(dispatch, this.intervalMs);
    this.timer.unref();
    void dispatch();
  }

  stop() {
    clearInterval(this.timer);
  }
}

module.exports = { OutboxDispatcher };
