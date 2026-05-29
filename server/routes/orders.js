const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const pool = require('../config/db');
const emailService = require('../config/email');
const { getSessionUser, requireAuth } = require('../middleware/auth');

// ── POST /api/orders — crear un pedido ───────────────────────────
router.post('/api/orders', async (req, res) => {
    const { items, client_email } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ success: false, message: 'Cesta vacía.' });

    const sessionUser = getSessionUser(req);
    const order_id = Date.now().toString();
    const qr_code = 'QR_' + order_id;
    const total_price = items.reduce((a, b) => a + parseFloat(b.price) * (parseInt(b.qty) || 1), 0);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Validar stock disponible (bloqueando las filas para evitar carreras)
        for (const item of items) {
            if (!item.id) continue;
            const qty = parseInt(item.qty) || 1;
            const stockResult = await client.query(
                'SELECT name, stock FROM products WHERE id = $1 FOR UPDATE',
                [item.id]
            );
            if (stockResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: `El producto "${item.name}" ya no está disponible.` });
            }
            const { name, stock } = stockResult.rows[0];
            if (stock !== null && qty > stock) {
                await client.query('ROLLBACK');
                return res.status(409).json({
                    success: false,
                    message: stock <= 0
                        ? `"${name}" está agotado.`
                        : `Solo quedan ${stock} unidad(es) de "${name}". Reduce la cantidad en tu cesta.`,
                    product_id: item.id,
                    available: stock
                });
            }
        }

        let client_id = null;
        const effectiveEmail = (sessionUser && sessionUser.role === 'cliente') ? sessionUser.email : client_email;
        if (sessionUser && sessionUser.role === 'cliente') {
            client_id = sessionUser.id;
        } else if (client_email) {
            const found = await client.query("SELECT id FROM users WHERE email = $1 AND role = 'CLIENT'", [client_email]);
            if (found.rows.length > 0) client_id = found.rows[0].id;
        }

        // Generar payload del QR (sin carácter € para compatibilidad)
        const fecha = new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const qr_payload = JSON.stringify({
            ref: qr_code,
            txId: order_id,
            cliente: effectiveEmail || 'Invitado',
            articulos: items.map(p => ({
                nombre: p.name,
                productor: p.producer_name || '',
                precio: (parseFloat(p.price) * (parseInt(p.qty) || 1)).toFixed(2),
                qty: parseInt(p.qty) || 1
            })),
            total: total_price.toFixed(2),
            fecha
        });

        const orderResult = await client.query(
            `INSERT INTO orders (client_id, client_email, qr_code, qr_payload, total_price, status)
             VALUES ($1, $2, $3, $4, $5, 'PENDING') RETURNING id`,
            [client_id, effectiveEmail || null, qr_code, qr_payload, total_price]
        );
        const dbOrderId = orderResult.rows[0].id;

        // Insertar líneas de pedido (con cantidad) y descontar stock
        for (const item of items) {
            const qty = parseInt(item.qty) || 1;
            await client.query(
                `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price)
                 VALUES ($1, $2, $3, $4, $5)`,
                [dbOrderId, item.id || null, item.name, qty, parseFloat(item.price)]
            );
            if (item.id) {
                await client.query(
                    'UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock IS NOT NULL',
                    [qty, item.id]
                );
            }
        }

        await client.query('COMMIT');

        // Enviar email de confirmación al cliente
        let emailPreviewUrl = null;
        if (effectiveEmail) {
            try {
                const qrBuffer = await QRCode.toBuffer(qr_payload);
                const { previewUrl } = await emailService.sendOrderConfirmation({
                    to: effectiveEmail,
                    orderId: order_id,
                    qrCode: qr_code,
                    qrBuffer,
                    items,
                    total: total_price
                });
                emailPreviewUrl = previewUrl;
            } catch (e) {
                console.error('Error email confirmación:', e.message);
            }
        }

        // Notificar a cada productor afectado
        try {
            const producerIds = [...new Set(items.filter(i => i.producer_id).map(i => i.producer_id))];
            for (const pid of producerIds) {
                const pResult = await pool.query(
                    "SELECT name, email FROM users WHERE id = $1 AND role = 'PRODUCER'",
                    [pid]
                );
                if (pResult.rows.length > 0) {
                    const producer = pResult.rows[0];
                    const producerItems = items.filter(i => i.producer_id === pid);
                    await emailService.sendNewOrderToProducer({
                        to: producer.email,
                        producerName: producer.name,
                        orderId: dbOrderId,
                        qrCode: qr_code,
                        clientEmail: effectiveEmail || 'Invitado',
                        items: producerItems,
                        total: producerItems.reduce((s, i) => s + parseFloat(i.price) * (parseInt(i.qty) || 1), 0)
                    });
                }
            }
        } catch (e) {
            console.error('Error notificando productor:', e.message);
        }

        res.json({ success: true, order_id: dbOrderId, qr_code, qr_payload, emailPreviewUrl });
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
            return res.json({ success: false, alreadyDone: false, message: 'Código no encontrado o no pertenece a tus productos.' });
        }

        const order = orderResult.rows[0];

        if (order.status === 'COMPLETED') {
            return res.json({ success: false, alreadyDone: true, message: 'Este pedido ya fue completado anteriormente.', order });
        }
        if (order.status === 'CANCELLED') {
            return res.json({ success: false, alreadyDone: true, message: 'Este pedido está cancelado.', order });
        }

        await pool.query("UPDATE orders SET status = 'COMPLETED' WHERE id = $1", [order.id]);

        res.json({ success: true, message: '¡Recogida verificada! Pedido marcado como completado.', order });
    } catch (err) {
        console.error('Error validate order:', err.message);
        res.status(500).json({ success: false, message: 'Error del servidor.' });
    }
});

// ── POST /api/orders/:id/cancel — cancelar pedido (cliente) ──────
router.post('/api/orders/:id/cancel', async (req, res) => {
    const user = getSessionUser(req);
    if (!user || user.role !== 'cliente') return res.status(403).json({ success: false, message: 'Acceso denegado.' });

    try {
        const result = await pool.query(
            `UPDATE orders SET status = 'CANCELLED'
             WHERE id = $1 AND client_id = $2 AND status = 'PENDING'
             RETURNING id`,
            [parseInt(req.params.id), user.id]
        );
        if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Pedido no encontrado o no cancelable.' });
        res.json({ success: true });
    } catch (err) {
        console.error('Error cancel order:', err.message);
        res.status(500).json({ success: false, message: 'Error del servidor.' });
    }
});

// ── POST /api/orders/:id/reject — rechazar pedido (productor) ────
router.post('/api/orders/:id/reject', async (req, res) => {
    const user = getSessionUser(req);
    if (!user || user.role !== 'productor') return res.status(403).json({ success: false, message: 'Acceso denegado.' });

    const { reason } = req.body;

    try {
        // Verificar que el pedido contiene productos de este productor
        const check = await pool.query(
            `SELECT o.id FROM orders o
             JOIN order_items oi ON oi.order_id = o.id
             JOIN products p ON p.id = oi.product_id
             JOIN users u ON u.id = p.producer_id
             WHERE o.id = $1 AND u.email = $2 AND o.status = 'PENDING'
             LIMIT 1`,
            [parseInt(req.params.id), user.email]
        );
        if (check.rows.length === 0) return res.status(404).json({ success: false, message: 'Pedido no encontrado o no cancelable.' });

        await pool.query(
            "UPDATE orders SET status = 'CANCELLED', rejection_reason = $1 WHERE id = $2",
            [reason || 'Rechazado por el productor', parseInt(req.params.id)]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error reject order:', err.message);
        res.status(500).json({ success: false, message: 'Error del servidor.' });
    }
});

module.exports = router;
