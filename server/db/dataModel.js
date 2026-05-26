const { pool } = require('./postgres');

// Fallback to mockDb if postgres connection fails, to keep app running locally
let usePostgres = false;
pool.query('SELECT 1').then(() => {
    usePostgres = true;
    console.log('🔗 Usando PostgreSQL real como base de datos principal.');
}).catch(() => {
    console.log('⚠️ No se pudo conectar a PostgreSQL. Usando base de datos en memoria (MockDB) como fallback para entorno de desarrollo.');
});

const mockDb = require('./mockDb');

async function getProducers() {
    if (usePostgres) {
        const res = await pool.query('SELECT * FROM producers');
        return res.rows;
    }
    return mockDb.producers;
}

async function getProducts() {
    if (usePostgres) {
        const res = await pool.query('SELECT * FROM products');
        return res.rows;
    }
    return mockDb.products;
}

async function getClients() {
    if (usePostgres) {
        const res = await pool.query('SELECT * FROM clients');
        return res.rows;
    }
    return mockDb.clients;
}

async function getOrders() {
    if (usePostgres) {
        const res = await pool.query('SELECT * FROM orders');
        return res.rows;
    }
    return mockDb.orders;
}

async function getProductsWithProducers() {
    if (usePostgres) {
        const res = await pool.query(`
            SELECT pr.*, p.name as producer_name, p.lat, p.lng 
            FROM products pr 
            JOIN producers p ON pr.producer_id = p.id 
            WHERE p.verified = true AND p.isblocked = false
        `);
        return res.rows;
    }
    return mockDb.products.filter(prod => {
        const producer = mockDb.producers.find(p => p.id === prod.producer_id);
        return producer && producer.verified && !producer.isBlocked;
    }).map(prod => {
        const producer = mockDb.producers.find(p => p.id === prod.producer_id);
        return { ...prod, producer_name: producer.name, lat: producer.lat, lng: producer.lng };
    });
}

async function addOrder(order) {
    if (usePostgres) {
        await pool.query(`
            INSERT INTO orders (order_id, client_email, qr_code, status, total_price, items)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [order.order_id, order.client_email, order.qr_code, order.status, order.total_price, JSON.stringify(order.items)]);
        return;
    }
    mockDb.orders.push(order);
}

// Implement other necessary methods (findProducerByEmail, etc.) as needed...
module.exports = {
    getProducers,
    getProducts,
    getClients,
    getOrders,
    getProductsWithProducers,
    addOrder,
    // Add direct mockDb export for simple synchronous access in parts that haven't been migrated
    rawDb: mockDb 
};
