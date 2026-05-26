CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE user_role AS ENUM ('CLIENT', 'PRODUCER', 'ADMIN');
CREATE TYPE user_status AS ENUM ('UNVERIFIED', 'VERIFIED');
CREATE TYPE order_status AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    role user_role NOT NULL DEFAULT 'CLIENT',
    name VARCHAR(255) NOT NULL,
    age INT,
    locality VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    status user_status DEFAULT 'UNVERIFIED',
    dni VARCHAR(50),
    cadastral_ref VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE points_of_sale (
    id SERIAL PRIMARY KEY,
    producer_id INT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location GEOMETRY(Point, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    producer_id INT REFERENCES users(id) ON DELETE CASCADE,
    point_of_sale_id INT REFERENCES points_of_sale(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    kg DECIMAL(10,2) NOT NULL,
    pickup_day VARCHAR(50),
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    client_id INT REFERENCES users(id) ON DELETE SET NULL, 
    -- Null if anonymous checkout or account deleted, but usually required
    product_id INT REFERENCES products(id),
    quantity INT NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    qr_code_hash VARCHAR(255),
    status order_status DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE favorites (
    client_id INT REFERENCES users(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (client_id, product_id)
);
