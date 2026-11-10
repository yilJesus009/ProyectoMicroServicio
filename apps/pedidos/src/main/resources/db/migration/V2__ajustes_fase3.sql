-- Ajustes de la fase 3 (no se edita V1, ya aplicada - AGENTS.md 4.7):
--   1. from_status admite NULL: la primera fila del historial no tiene
--      "desde" (docs/contratos-api.md, ejemplo de pedido).
--   2. part_description pasa a text: la descripcion de una solicitud puede
--      superar varchar(255) y el insert fallaria (el mensaje iria a la dlq
--      y el pedido nunca se crearia).
--   3. Constraint de offer_id con nombre explicito, para poder distinguir
--      en Java "ya existe un pedido para esta oferta" (se trata como ya
--      procesado) de cualquier otro error de integridad (ese si va a la dlq).

ALTER TABLE order_status_history ALTER COLUMN from_status DROP NOT NULL;

ALTER TABLE orders ALTER COLUMN part_description TYPE text;

ALTER TABLE orders RENAME CONSTRAINT orders_offer_id_key TO uq_orders_offer_id;
