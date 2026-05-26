const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { getSessionUser, requireAuth } = require('../middleware/auth');

// ── GET /api/producers/by-email ──────────────────────────────────
router.get('/api/producers/by-email', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, last_name, email, phone, locality, status, is_blocked,
                    dni, cadastral_ref, history, profile_image,
                    ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng
             FROM users WHERE email = $1 AND role = 'PRODUCER'`,
            [req.query.email]
        );
        if (result.rows.length === 0) return res.json({ success: false });

        const p = result.rows[0];
        res.json({
            success: true,
            producer: {
                id: p.id, name: p.name, lastName: p.last_name, email: p.email,
                phone: p.phone, locality: p.locality,
                verified: p.status === 'VERIFIED',
                isBlocked: p.is_blocked,
                history: p.history, profileImage: p.profile_image,
                lat: parseFloat(p.lat), lng: parseFloat(p.lng)
            }
        });
    } catch (err) {
        console.error('Error producers/by-email:', err.message);
        res.status(500).json({ success: false });
    }
});

// ── POST /api/producers/:id/verify — solo admin ──────────────────
router.post('/api/producers/:id/verify', requireAuth('admin'), async (req, res) => {
    try {
        const result = await pool.query(
            "UPDATE users SET status = 'VERIFIED' WHERE id = $1 AND role = 'PRODUCER' RETURNING id",
            [req.params.id]
        );
        if (result.rowCount === 0) return res.status(404).json({ success: false });
        res.json({ success: true });
    } catch (err) {
        console.error('Error verify producer:', err.message);
        res.status(500).json({ success: false });
    }
});

// ── POST /api/producers/update-profile ──────────────────────────
router.post('/api/producers/update-profile', async (req, res) => {
    const user = getSessionUser(req);
    if (!user || user.role !== 'productor') return res.status(403).json({ success: false });

    const { profileImage, history } = req.body;
    try {
        await pool.query(
            'UPDATE users SET profile_image = COALESCE($1, profile_image), history = COALESCE($2, history) WHERE email = $3 AND role = \'PRODUCER\'',
            [profileImage !== undefined ? profileImage : null,
             history !== undefined ? history : null,
             user.email]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error update-profile:', err.message);
        res.status(500).json({ success: false });
    }
});

// ── POST /api/products/add ────────────────────────────────────────
router.post('/api/products/add', async (req, res) => {
    const user = getSessionUser(req);
    if (!user || user.role !== 'productor') return res.status(403).json({ success: false });

    const { name, category, price, kg, pickup_day, image_url } = req.body;
    if (!name || !price) return res.status(400).json({ success: false, message: 'Nombre y precio obligatorios' });

    try {
        const result = await pool.query(
            `INSERT INTO products (producer_id, name, category, price, kg, pickup_day, image_url)
             SELECT id, $1, $2, $3, $4, $5, $6 FROM users WHERE email = $7 AND role = 'PRODUCER'
             RETURNING *`,
            [name, category || 'Otros', parseFloat(price),
             parseFloat(kg) || 1.0, pickup_day || 'Consultar',
             image_url || 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800',
             user.email]
        );
        if (result.rowCount === 0) return res.status(404).json({ success: false });
        res.json({ success: true, product: result.rows[0] });
    } catch (err) {
        console.error('Error products/add:', err.message);
        res.status(500).json({ success: false });
    }
});

// ── DELETE /api/products/:id ──────────────────────────────────────
router.delete('/api/products/:id', async (req, res) => {
    const user = getSessionUser(req);
    if (!user || user.role !== 'productor') return res.status(403).json({ success: false });

    try {
        const result = await pool.query(
            `DELETE FROM products WHERE id = $1
             AND producer_id = (SELECT id FROM users WHERE email = $2 AND role = 'PRODUCER')`,
            [parseInt(req.params.id), user.email]
        );
        if (result.rowCount === 0) return res.status(404).json({ success: false });
        res.json({ success: true });
    } catch (err) {
        console.error('Error delete product:', err.message);
        res.status(500).json({ success: false });
    }
});

// ── GET /api/favorites ────────────────────────────────────────────
router.get('/api/favorites', async (req, res) => {
    const user = getSessionUser(req);
    if (!user || user.role !== 'cliente') return res.status(403).json({ success: false, favorites: [] });

    try {
        const result = await pool.query(
            `SELECT p.id, p.name, p.category, p.price, p.kg, p.pickup_day, p.image_url,
                    u.name AS producer_name, u.id AS producer_id
             FROM favorites f
             JOIN products p ON f.product_id = p.id
             JOIN users u ON p.producer_id = u.id
             WHERE f.client_id = $1`,
            [user.id]
        );
        res.json({ success: true, favorites: result.rows });
    } catch (err) {
        console.error('Error get favorites:', err.message);
        res.status(500).json({ success: false, favorites: [] });
    }
});

// ── POST /api/favorites/toggle ────────────────────────────────────
router.post('/api/favorites/toggle', async (req, res) => {
    const user = getSessionUser(req);
    if (!user || user.role !== 'cliente') return res.status(403).json({ success: false });

    const { product_id } = req.body;
    if (!product_id) return res.status(400).json({ success: false });

    try {
        // Verificar si ya existe el favorito
        const existing = await pool.query(
            'SELECT 1 FROM favorites WHERE client_id = $1 AND product_id = $2',
            [user.id, product_id]
        );

        if (existing.rows.length > 0) {
            await pool.query('DELETE FROM favorites WHERE client_id = $1 AND product_id = $2', [user.id, product_id]);
            return res.json({ success: true, action: 'removed' });
        } else {
            await pool.query('INSERT INTO favorites (client_id, product_id) VALUES ($1, $2)', [user.id, product_id]);
            return res.json({ success: true, action: 'added' });
        }
    } catch (err) {
        console.error('Error favorites/toggle:', err.message);
        res.status(500).json({ success: false });
    }
});

module.exports = router;
