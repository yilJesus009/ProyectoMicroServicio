-- Nombre predecible para poder detectar el conflicto de "segundo pago"
-- por el nombre de la restriccion (igual patron que uq_orders_offer_id en V2).
ALTER TABLE payments RENAME CONSTRAINT payments_order_id_key TO uq_payments_order_id;
