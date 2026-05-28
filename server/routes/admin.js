const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// ── POST /api/admin/block — bloquear/desbloquear usuario ─────────
router.post('/api/admin/block', requireAuth('admin'), async (req, res) => {
    const { type, id, block } = req.body;
    const role = type === 'productor' ? 'PRODUCER' : 'CLIENT';

    try {
        const result = await pool.query(
            'UPDATE users SET is_blocked = $1 WHERE id = $2 AND role = $3 RETURNING id',
            [block, parseInt(id), role]
        );
        if (result.rowCount === 0) return res.status(404).json({ success: false });
        res.json({ success: true });
    } catch (err) {
        console.error('Error admin/block:', err.message);
        res.status(500).json({ success: false });
    }
});

// ── POST /api/admin/remove-photo — eliminar foto de productor ────
router.post('/api/admin/remove-photo', requireAuth('admin'), async (req, res) => {
    const { id } = req.body;
    try {
        const result = await pool.query(
            "UPDATE users SET profile_image = '' WHERE id = $1 AND role = 'PRODUCER' RETURNING id",
            [parseInt(id)]
        );
        if (result.rowCount === 0) return res.status(404).json({ success: false });
        res.json({ success: true });
    } catch (err) {
        console.error('Error admin/remove-photo:', err.message);
        res.status(500).json({ success: false });
    }
});

// ── POST /api/admin/cancel-order — cancelar pedido ───────────────
router.post('/api/admin/cancel-order', requireAuth('admin'), async (req, res) => {
    const { order_id } = req.body;
    try {
        const result = await pool.query(
            "UPDATE orders SET status = 'CANCELLED' WHERE id = $1 RETURNING id",
            [parseInt(order_id)]
        );
        if (result.rowCount === 0) return res.status(404).json({ success: false });
        res.json({ success: true });
    } catch (err) {
        console.error('Error admin/cancel-order:', err.message);
        res.status(500).json({ success: false });
    }
});

// ── GET /api/admin/kpis ──────────────────────────────────────────
router.get('/api/admin/kpis', requireAuth('admin'), async (req, res) => {
    try {
        const [totalProducers, pendingProducers, totalClients, ordersToday, totalRevenue] = await Promise.all([
            pool.query("SELECT COUNT(*) FROM users WHERE role = 'PRODUCER'"),
            pool.query("SELECT COUNT(*) FROM users WHERE role = 'PRODUCER' AND status = 'UNVERIFIED' AND is_blocked = FALSE"),
            pool.query("SELECT COUNT(*) FROM users WHERE role = 'CLIENT'"),
            pool.query("SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURRENT_DATE AND status != 'CANCELLED'"),
            pool.query("SELECT COALESCE(SUM(total_price), 0) AS total FROM orders WHERE status = 'COMPLETED'")
        ]);
        res.json({
            success: true,
            totalProducers: parseInt(totalProducers.rows[0].count),
            pendingProducers: parseInt(pendingProducers.rows[0].count),
            totalClients: parseInt(totalClients.rows[0].count),
            ordersToday: parseInt(ordersToday.rows[0].count),
            totalRevenue: parseFloat(totalRevenue.rows[0].total)
        });
    } catch (err) {
        console.error('Error admin/kpis:', err.message);
        res.status(500).json({ success: false });
    }
});

module.exports = router;
