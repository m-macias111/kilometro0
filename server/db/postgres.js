const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function initDB() {
    try {
        await pool.query(`
            CREATE EXTENSION IF NOT EXISTS postgis;
            
            CREATE TABLE IF NOT EXISTS producers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                lastName VARCHAR(255),
                email VARCHAR(255) UNIQUE,
                password VARCHAR(255),
                locality VARCHAR(255),
                phone VARCHAR(50),
                verified BOOLEAN DEFAULT false,
                isBlocked BOOLEAN DEFAULT false,
                dni VARCHAR(50),
                catastral VARCHAR(255),
                lat FLOAT,
                lng FLOAT,
                history TEXT,
                profileImage TEXT,
                location GEOMETRY(Point, 4326)
            );

            CREATE TABLE IF NOT EXISTS clients (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                lastName VARCHAR(255),
                email VARCHAR(255) UNIQUE,
                password VARCHAR(255),
                isBlocked BOOLEAN DEFAULT false
            );

            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                producer_id INTEGER REFERENCES producers(id),
                name VARCHAR(255),
                category VARCHAR(100),
                price FLOAT,
                kg FLOAT,
                pickup_day VARCHAR(100),
                image_url TEXT
            );

            CREATE TABLE IF NOT EXISTS orders (
                order_id VARCHAR(100) PRIMARY KEY,
                client_email VARCHAR(255),
                qr_code VARCHAR(255),
                status VARCHAR(50),
                total_price FLOAT,
                items JSONB
            );
        `);
        console.log("🐘 PostgreSQL (con PostGIS) inicializado correctamente.");
        
        // Seed if empty
        const res = await pool.query('SELECT COUNT(*) FROM producers');
        if (parseInt(res.rows[0].count) === 0) {
            console.log("🌱 Sembrando base de datos con datos de prueba...");
            const mock = require('./mockDb');
            
            for (const p of mock.producers) {
                await pool.query(`
                    INSERT INTO producers (id, name, lastName, email, password, locality, phone, verified, isBlocked, dni, catastral, lat, lng, history, profileImage, location)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, ST_SetSRID(ST_MakePoint($13, $12), 4326))
                `, [p.id, p.name, p.lastName, p.email, p.password, p.locality, p.phone, p.verified, p.isBlocked, p.dni || '', p.catastral || '', p.lat, p.lng, p.history, p.profileImage]);
            }
            
            for (const c of mock.clients) {
                await pool.query(`
                    INSERT INTO clients (id, name, lastName, email, password, isBlocked)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [c.id, c.name, c.lastName, c.email, c.password, c.isBlocked]);
            }
            
            for (const prod of mock.products) {
                await pool.query(`
                    INSERT INTO products (id, producer_id, name, category, price, kg, pickup_day, image_url)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [prod.id, prod.producer_id, prod.name, prod.category, prod.price, prod.kg, prod.pickup_day, prod.image_url]);
            }
            
            // Fix sequences since we inserted explicit IDs
            await pool.query(`SELECT setval('producers_id_seq', (SELECT MAX(id) FROM producers))`);
            await pool.query(`SELECT setval('clients_id_seq', (SELECT MAX(id) FROM clients))`);
            await pool.query(`SELECT setval('products_id_seq', (SELECT MAX(id) FROM products))`);
            
            console.log("✅ Datos sembrados.");
        }
    } catch (err) {
        console.error("❌ Error inicializando PostgreSQL:", err.message);
    }
}

module.exports = {
    pool,
    initDB
};
