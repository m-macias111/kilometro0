const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { getSessionUser } = require('../middleware/auth');

// ── Helpers ─────────────────────────────────────────────────────

async function getProductsWithProducers() {
    const result = await pool.query(
        `SELECT p.id, p.producer_id, p.name, p.category, p.price, p.kg, p.pickup_day, p.image_url,
                u.name AS producer_name,
                ST_Y(u.location::geometry) AS lat,
                ST_X(u.location::geometry) AS lng
         FROM products p
         JOIN users u ON p.producer_id = u.id
         WHERE u.status = 'VERIFIED' AND u.is_blocked = FALSE
         ORDER BY p.id`
    );
    return result.rows.map(r => ({
        ...r,
        price: parseFloat(r.price),
        kg: parseFloat(r.kg),
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lng),
    }));
}

async function getPublicProducers() {
    const result = await pool.query(
        `SELECT id, name, last_name AS "lastName", locality, phone, history, profile_image AS "profileImage",
                status, is_blocked AS "isBlocked",
                ST_Y(location::geometry) AS lat,
                ST_X(location::geometry) AS lng
         FROM users
         WHERE role = 'PRODUCER' AND status = 'VERIFIED' AND is_blocked = FALSE
         ORDER BY id`
    );
    return result.rows.map(r => ({
        ...r,
        verified: true,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lng),
    }));
}

// ── RUTAS PÚBLICAS ───────────────────────────────────────────────

router.get('/', async (req, res) => {
    try {
        const [products, producers] = await Promise.all([
            getProductsWithProducers(),
            getPublicProducers()
        ]);
        res.render('index', { products, producers, page: 'home' });
    } catch (err) {
        console.error('Error cargando home:', err.message);
        res.render('index', { products: [], producers: [], page: 'home' });
    }
});

router.get('/about', (req, res) => {
    res.render('about', { page: 'about' });
});

router.get('/login', (req, res) => {
    res.render('login', { page: 'login' });
});

router.get('/register', (req, res) => {
    const role = req.query.role || 'cliente';
    res.render('register', { page: 'register', role });
});

router.get('/producer-profile', async (req, res) => {
    const id = parseInt(req.query.id) || 0;
    try {
        const producerResult = await pool.query(
            `SELECT id, name, last_name AS "lastName", locality, phone, history,
                    profile_image AS "profileImage", status
             FROM users WHERE id = $1 AND role = 'PRODUCER'`,
            [id]
        );
        const producer = producerResult.rows[0] || null;

        const productsResult = await pool.query(
            `SELECT p.id, p.producer_id, p.name, p.category, p.price, p.kg, p.pickup_day, p.image_url,
                    u.name AS producer_name,
                    ST_Y(u.location::geometry) AS lat,
                    ST_X(u.location::geometry) AS lng
             FROM products p
             JOIN users u ON p.producer_id = u.id
             WHERE p.producer_id = $1`,
            [id]
        );
        const products = productsResult.rows.map(r => ({
            ...r,
            price: parseFloat(r.price),
            kg: parseFloat(r.kg),
            lat: parseFloat(r.lat),
            lng: parseFloat(r.lng),
        }));

        res.render('producer-profile', { page: 'producer-profile', producer, products });
    } catch (err) {
        console.error('Error producer-profile:', err.message);
        res.render('producer-profile', { page: 'producer-profile', producer: null, products: [] });
    }
});

// ── PROTECTED: Dashboard Productor ──────────────────────────────
router.get('/producer-app', async (req, res) => {
    const user = getSessionUser(req);
    if (!user || user.role !== 'productor') return res.redirect('/login');

    try {
        const producerResult = await pool.query(
            `SELECT id, name, last_name AS "lastName", email, phone, locality, history,
                    profile_image AS "profileImage", status, dni, cadastral_ref AS "catastral"
             FROM users WHERE email = $1 AND role = 'PRODUCER'`,
            [user.email]
        );
        if (producerResult.rows.length === 0) return res.redirect('/login');
        const producer = producerResult.rows[0];
        producer.verified = producer.status === 'VERIFIED';

        const productsResult = await pool.query(
            'SELECT * FROM products WHERE producer_id = $1 ORDER BY id',
            [producer.id]
        );
        const products = productsResult.rows.map(r => ({ ...r, price: parseFloat(r.price), kg: parseFloat(r.kg) }));

        // Pedidos que incluyen productos de este productor
        const ordersResult = await pool.query(
            `SELECT DISTINCT o.id AS order_id, o.client_email, o.qr_code, o.status, o.total_price, o.created_at,
                    json_agg(json_build_object('id', oi.product_id, 'name', oi.product_name, 'price', oi.unit_price)) AS items
             FROM orders o
             JOIN order_items oi ON oi.order_id = o.id
             JOIN products p ON p.id = oi.product_id
             WHERE p.producer_id = $1
             GROUP BY o.id
             ORDER BY o.created_at DESC`,
            [producer.id]
        );
        const orders = ordersResult.rows.map(o => ({
            ...o,
            total_price: parseFloat(o.total_price),
            items: o.items || []
        }));

        // Estadísticas
        const notCancelled = orders.filter(o => o.status !== 'CANCELLED');
        const totalSales = notCancelled.length;
        const totalRevenue = notCancelled.reduce((sum, o) => sum + parseFloat(o.total_price), 0);
        const pendingOrders = orders.filter(o => o.status === 'PENDING').length;

        res.render('producer-app', {
            page: 'producer-app',
            producer,
            products,
            orders,
            stats: { totalSales, totalRevenue, pendingOrders }
        });
    } catch (err) {
        console.error('Error producer-app:', err.message);
        res.redirect('/login');
    }
});

// ── PROTECTED: Dashboard Cliente ────────────────────────────────
router.get('/client-app', async (req, res) => {
    const user = getSessionUser(req);
    if (!user || user.role !== 'cliente') return res.redirect('/login');

    try {
        const clientResult = await pool.query(
            'SELECT id, name, last_name AS "lastName", email FROM users WHERE id = $1',
            [user.id]
        );
        if (clientResult.rows.length === 0) return res.redirect('/login');
        const client = clientResult.rows[0];

        // Pedidos del cliente
        const ordersResult = await pool.query(
            `SELECT o.id AS order_id, o.qr_code, o.status, o.total_price, o.created_at,
                    json_agg(json_build_object('name', oi.product_name, 'price', oi.unit_price)) AS items
             FROM orders o
             LEFT JOIN order_items oi ON oi.order_id = o.id
             WHERE o.client_id = $1
             GROUP BY o.id
             ORDER BY o.created_at DESC`,
            [user.id]
        );
        const orders = ordersResult.rows.map(o => ({
            ...o,
            total_price: parseFloat(o.total_price),
            items: o.items || []
        }));

        // Favoritos del cliente
        const favResult = await pool.query(
            `SELECT p.id, p.name, p.category, p.price, p.kg, p.pickup_day, p.image_url,
                    u.name AS producer_name, u.id AS producer_id
             FROM favorites f
             JOIN products p ON f.product_id = p.id
             JOIN users u ON p.producer_id = u.id
             WHERE f.client_id = $1`,
            [user.id]
        );
        const favorites = favResult.rows.map(r => ({ ...r, price: parseFloat(r.price), kg: parseFloat(r.kg) }));

        res.render('client-app', { page: 'client-app', client, orders, favorites });
    } catch (err) {
        console.error('Error client-app:', err.message);
        res.redirect('/login');
    }
});

// ── PROTECTED: Panel Admin ───────────────────────────────────────
router.get('/admin-app', async (req, res) => {
    const user = getSessionUser(req);
    if (!user || user.role !== 'admin') return res.redirect('/login');

    try {
        const producersResult = await pool.query(
            `SELECT id, name, last_name AS "lastName", email, phone, locality,
                    profile_image AS "profileImage", history, status, is_blocked AS "isBlocked",
                    dni, cadastral_ref AS "catastral"
             FROM users WHERE role = 'PRODUCER' ORDER BY id`
        );
        const producers = producersResult.rows.map(p => ({
            ...p,
            verified: p.status === 'VERIFIED'
        }));

        const clientsResult = await pool.query(
            'SELECT id, name, last_name AS "lastName", email, is_blocked AS "isBlocked" FROM users WHERE role = \'CLIENT\' ORDER BY id'
        );
        const clients = clientsResult.rows;

        const ordersResult = await pool.query(
            `SELECT o.id AS order_id, o.qr_code, o.status, o.total_price, o.client_email, o.created_at,
                    json_agg(json_build_object('name', oi.product_name, 'price', oi.unit_price)) AS items
             FROM orders o
             LEFT JOIN order_items oi ON oi.order_id = o.id
             GROUP BY o.id
             ORDER BY o.created_at DESC`
        );
        const orders = ordersResult.rows.map(o => ({
            ...o,
            total_price: parseFloat(o.total_price),
            items: o.items || []
        }));

        res.render('admin-app', { page: 'admin-app', producers, clients, orders });
    } catch (err) {
        console.error('Error admin-app:', err.message);
        res.redirect('/login');
    }
});

module.exports = router;
