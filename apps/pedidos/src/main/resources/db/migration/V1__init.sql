-- Esquema pedidos (docs/modelo-datos.md). Flyway corre con
-- default-schema=pedidos: las tablas sin calificar aterrizan ahi.

CREATE TABLE orders (
    id bigserial PRIMARY KEY,
    offer_id bigint NOT NULL UNIQUE,
    part_request_id bigint NOT NULL,
    buyer_id bigint NOT NULL,
    supplier_id bigint NOT NULL,
    supplier_name varchar(160) NOT NULL,
    part_description varchar(255) NOT NULL,
    vehicle_label varchar(160) NOT NULL,
    price numeric(10, 2) NOT NULL,
    currency varchar(3) NOT NULL,
    delivery_type varchar(20) NOT NULL CHECK (delivery_type IN ('PICKUP', 'DELIVERY')),
    estimated_days int NOT NULL,
    status varchar(20) NOT NULL CHECK (
        status IN ('PENDING_PAYMENT', 'PREPARING', 'IN_TRANSIT', 'READY_FOR_PICKUP', 'DELIVERED', 'COMPLETED')
    ),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_status_history (
    id bigserial PRIMARY KEY,
    order_id bigint NOT NULL REFERENCES orders (id),
    from_status varchar(20) NOT NULL,
    to_status varchar(20) NOT NULL,
    changed_by bigint NOT NULL,
    changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payments (
    id bigserial PRIMARY KEY,
    order_id bigint NOT NULL UNIQUE REFERENCES orders (id),
    method varchar(10) NOT NULL CHECK (method IN ('QR', 'CARD')),
    reference varchar(60) NOT NULL,
    amount numeric(10, 2) NOT NULL,
    paid_at timestamptz NOT NULL DEFAULT now()
);

-- Tablas comunes de mensajeria (docs/eventos.md).
CREATE TABLE outbox_events (
    id uuid PRIMARY KEY,
    exchange varchar(100) NOT NULL,
    routing_key varchar(100) NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz NULL,
    attempts int NOT NULL DEFAULT 0
);

CREATE TABLE processed_events (
    event_id uuid PRIMARY KEY,
    event_name varchar(100) NOT NULL,
    processed_at timestamptz NOT NULL DEFAULT now()
);
