const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const pool = require('../config/db');
const email = require('../config/email');
const { getSessionUser, requireAuth } = require('../middleware/auth');

// ── POST /api/orders — crear un pedido ───────────────────────────
router.post('/api/orders', async (req, res) => {
    const { items, client_email } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ success: false, message: 'Cesta vacía.' });

    const sessionUser = getSessionUser(req);
    const order_id = Date.now().toString();
    const qr_code = 'QR_' + order_id;
    const total_price = items.reduce((a, b) => a + parseFloat(b.price), 0);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Buscar client_id si el usuario está autenticado
        let client_id = null;
        if (sessionUser && sessionUser.role === 'cliente') {
            client_id = sessionUser.id;
        } else if (client_email) {
            const found = await client.query('SELECT id FROM users WHERE email = $1 AND role = \'CLIENT\'', [client_email]);
            if (found.rows.length > 0) client_id = found.rows[0].id;
        }

        // Insertar pedido
        const orderResult = await client.query(
            'INSERT INTO orders (client_id, client_email, qr_code, total_price, status) VALUES ($1, $2, $3, $4, \'PENDING\') RETURNING id',
            [client_id, client_email || null, qr_code, total_price]
        );
        const dbOrderId = orderResult.rows[0].id;

        // Insertar líneas de pedido
        for (const item of items) {
            await client.query(
                'INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES ($1, $2, $3, 1, $4)',
                [dbOrderId, item.id || null, item.name, parseFloat(item.price)]
            );
        }

        await client.query('COMMIT');

        // Enviar email de confirmación
        let emailPreviewUrl = null;
        if (client_email) {
            try {
                const qrBuffer = await QRCode.toBuffer(qr_code);
                const { previewUrl } = await email.sendOrderConfirmation({
                    to: client_email,
                    orderId: order_id,
                    qrCode: qr_code,
                    qrBuffer,
                    items,
                    total: total_price
                });
                emailPreviewUrl = previewUrl;
            } catch (e) {
                console.error('Error generando QR o enviando email:', e.message);
            }
        }

        res.json({ success: true, order_id: dbOrderId, qr_code, emailPreviewUrl });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error crear pedido:', err.message);
        res.status(500).json({ success: false, message: 'Error del servidor.' });
    } finally {
        client.release();
    }
});

// ── POST /api/orders/validate — validar recogida con QR ──────────
router.post('/api/orders/validate', async (req, res) => {
    const user = getSessionUser(req);
    if (!user || user.role !== 'productor') return res.status(403).json({ success: false, message: 'Acceso denegado.' });

    const { qr_code } = req.body;
    if (!qr_code) return res.status(400).json({ success: false, message: 'Código QR requerido.' });

    try {
        // Verificar que el pedido existe, está pendiente y contiene productos de este productor
        const orderResult = await pool.query(
            `SELECT o.id, o.qr_code, o.status, o.client_email, o.total_price, o.created_at
             FROM orders o
             JOIN order_items oi ON oi.order_id = o.id
             JOIN products p ON p.id = oi.product_id
             JOIN users u ON u.id = p.producer_id
             WHERE o.qr_code = $1 AND u.email = $2
             LIMIT 1`,
            [qr_code, user.email]
        );

        if (orderResult.rows.length === 0) {
            return res.json({ success: false, message: 'Código no encontrado o no pertenece a tus productos.' });
        }

        const order = orderResult.rows[0];

        if (order.status === 'COMPLETED') {
            return res.json({ success: false, message: 'Este pedido ya fue completado anteriormente.', order });
        }
        if (order.status === 'CANCELLED') {
            return res.json({ success: false, message: 'Este pedido está cancelado.', order });
        }

        // Marcar como completado
        await pool.query("UPDATE orders SET status = 'COMPLETED' WHERE id = $1", [order.id]);

        res.json({ success: true, message: '¡Recogida verificada! Pedido marcado como completado.', order });
    } catch (err) {
        console.error('Error validate order:', err.message);
        res.status(500).json({ success: false, message: 'Error del servidor.' });
    }
});

module.exports = router;
