ALTER TYPE "enum_orders_status" ADD VALUE IF NOT EXISTS 'READY_FOR_PICKUP';

CREATE UNIQUE INDEX IF NOT EXISTS uq_order_offer_id
  ON orders (offer_id);

CREATE INDEX IF NOT EXISTS ix_orders_buyer_created
  ON orders (buyer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_orders_provider_created
  ON orders (provider_id, created_at DESC);
