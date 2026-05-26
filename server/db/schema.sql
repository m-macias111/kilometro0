-- Kilómetro 0 — Esquema de base de datos
-- Ejecutar: psql -h localhost -U km0_user -d km0_db -f server/db/schema.sql

CREATE EXTENSION IF NOT EXISTS postgis;

-- Tipos enumerados (con guards para re-ejecución segura)
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('CLIENT', 'PRODUCER', 'ADMIN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE verification_status AS ENUM ('UNVERIFIED', 'VERIFIED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE order_status AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Usuarios (clientes y productores en la misma tabla, diferenciados por role)
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    role            user_role NOT NULL DEFAULT 'CLIENT',
    name            VARCHAR(255) NOT NULL,
    last_name       VARCHAR(255),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    phone           VARCHAR(50),
    locality        VARCHAR(255),
    status          verification_status DEFAULT 'UNVERIFIED',
    is_blocked      BOOLEAN DEFAULT FALSE,
    -- Campos exclusivos de productores
    dni             VARCHAR(50),
    cadastral_ref   VARCHAR(255),
    history         TEXT,
    profile_image   VARCHAR(500),
    location        GEOMETRY(Point, 4326),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Productos (asociados a un productor)
CREATE TABLE IF NOT EXISTS products (
    id          SERIAL PRIMARY KEY,
    producer_id INT REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    category    VARCHAR(100) DEFAULT 'Otros',
    price       DECIMAL(10,2) NOT NULL,
    kg          DECIMAL(10,2) NOT NULL DEFAULT 1,
    pickup_day  VARCHAR(100),
    image_url   VARCHAR(500),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pedidos
CREATE TABLE IF NOT EXISTS orders (
    id           SERIAL PRIMARY KEY,
    client_id    INT REFERENCES users(id) ON DELETE SET NULL,
    client_email VARCHAR(255),
    qr_code      VARCHAR(255) UNIQUE NOT NULL,
    total_price  DECIMAL(10,2) NOT NULL,
    status       order_status DEFAULT 'PENDING',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Líneas de pedido
CREATE TABLE IF NOT EXISTS order_items (
    id           SERIAL PRIMARY KEY,
    order_id     INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id   INT REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255),
    quantity     INT NOT NULL DEFAULT 1,
    unit_price   DECIMAL(10,2) NOT NULL
);

-- Favoritos
CREATE TABLE IF NOT EXISTS favorites (
    client_id   INT REFERENCES users(id) ON DELETE CASCADE,
    product_id  INT REFERENCES products(id) ON DELETE CASCADE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (client_id, product_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_users_location ON users USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_products_producer ON products (producer_id);
CREATE INDEX IF NOT EXISTS idx_orders_client ON orders (client_id);
CREATE INDEX IF NOT EXISTS idx_orders_qr ON orders (qr_code);
