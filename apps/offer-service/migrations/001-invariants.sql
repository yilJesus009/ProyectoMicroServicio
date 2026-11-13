CREATE UNIQUE INDEX IF NOT EXISTS uq_one_accepted_offer_per_request
  ON offers (request_id)
  WHERE status = 'ACCEPTED';

CREATE INDEX IF NOT EXISTS ix_offers_request_status
  ON offers (request_id, status);
