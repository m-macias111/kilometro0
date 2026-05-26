const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config({ path: '../.env' }); // Since seed is inside scripts or db folder, we path relative to it. Let's assume it's run from project root or server folder.
// Let's ensure dotenv loads from root
dotenv.config({ path: require('path').resolve(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const mockProducers = [
  { name: 'Granja de Tomates', email: 'granja@test.com', locality: 'Madrid', lat: 40.4168, lng: -3.7038, phone: '123456789' },
  { name: 'Quesería Artesanal', email: 'queso@test.com', locality: 'Barcelona', lat: 41.3851, lng: 2.1734, phone: '987654321' },
  { name: 'Huerto Ecológico', email: 'huerto@test.com', locality: 'Valencia', lat: 39.4699, lng: -0.3774, phone: '111222333' },
  { name: 'Miel de la Sierra', email: 'miel@test.com', locality: 'Seville', lat: 37.3891, lng: -5.9845, phone: '444555666' }
];

const mockProducts = [
  { producerIndex: 0, name: 'Pack Tomates Rosa 5kg', price: 12.50, kg: 5.0, pickup_day: 'Viernes', image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop' },
  { producerIndex: 1, name: 'Pack Queso Curado Oveja', price: 25.00, kg: 2.0, pickup_day: 'Lunes a Viernes', image_url: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=800&auto=format&fit=crop' },
  { producerIndex: 2, name: 'Cesta Verduras de Temporada 10kg', price: 18.00, kg: 10.0, pickup_day: 'Sábado', image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop' },
  { producerIndex: 3, name: 'Miel Pura de Montaña 3kg', price: 22.00, kg: 3.0, pickup_day: 'Lunes a Domingo', image_url: 'https://images.unsplash.com/photo-1587049352847-ecae2ecdf2be?w=800&auto=format&fit=crop' }
];

async function seed() {
  try {
    const passwordHash = await bcrypt.hash('password123', 10);
    
    // Create producers and points of sale
    for (let i = 0; i < mockProducers.length; i++) {
        const prod = mockProducers[i];
        
        let userResult = await pool.query(
            "INSERT INTO users (role, name, email, password_hash, locality, phone, status) VALUES ('PRODUCER', $1, $2, $3, $4, $5, 'VERIFIED') RETURNING id",
            [prod.name, prod.email, passwordHash, prod.locality, prod.phone]
        );
        const userId = userResult.rows[0].id;
        
        let posResult = await pool.query(
            "INSERT INTO points_of_sale (producer_id, name, description, location) VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)) RETURNING id",
            [userId, 'Punto de Venta de ' + prod.name, 'Descripción del punto de venta', prod.lng, prod.lat]
        );
        const posId = posResult.rows[0].id;

        // Find products for this producer
        const products = mockProducts.filter(p => p.producerIndex === i);
        for (const p of products) {
            await pool.query(
                "INSERT INTO products (producer_id, point_of_sale_id, name, price, kg, pickup_day, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                [userId, posId, p.name, p.price, p.kg, p.pickup_day, p.image_url]
            );
        }
    }
    
    console.log("Database seeded successfully.");
    process.exit(0);
  } catch (e) {
    console.error("Error seeding DB:", e);
    process.exit(1);
  }
}

seed();
