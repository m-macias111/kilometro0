const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

const SALT_ROUNDS = 10;

// ── POST /api/login ──────────────────────────────────────────────
router.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    // Admin hardcoded (no está en la base de datos)
    if (email === 'admin@admin' && password === 'admin') {
        const user = { email, name: 'Administrador', role: 'admin' };
        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
        res.cookie('km0_jwt', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
        return res.json({ success: true, user });
    }

    try {
        const result = await pool.query(
            'SELECT id, name, last_name, email, password_hash, role, status, is_blocked FROM users WHERE email = $1',
            [email]
        );
        const dbUser = result.rows[0];
        if (!dbUser) return res.json({ success: false, message: 'Email o contraseña incorrectos.' });

        const match = await bcrypt.compare(password, dbUser.password_hash);
        if (!match) return res.json({ success: false, message: 'Email o contraseña incorrectos.' });

        if (dbUser.is_blocked) return res.json({ success: false, message: 'Tu cuenta ha sido bloqueada por un administrador.' });

        const role = dbUser.role === 'PRODUCER' ? 'productor' : 'cliente';
        const user = { email: dbUser.email, name: dbUser.name, role, id: dbUser.id };
        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
        res.cookie('km0_jwt', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
        return res.json({ success: true, user });
    } catch (err) {
        console.error('Error en login:', err.message);
        res.status(500).json({ success: false, message: 'Error del servidor.' });
    }
});

// ── POST /api/logout ─────────────────────────────────────────────
router.post('/api/logout', (req, res) => {
    res.clearCookie('km0_jwt');
    res.json({ success: true });
});

// ── POST /api/register ───────────────────────────────────────────
router.post('/api/register', async (req, res) => {
    const { name, lastName, email, role, password, dni, catastral, address, phone } = req.body;

    try {
        // Verificar si el email ya existe
        const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (exists.rows.length > 0) {
            return res.json({ success: false, message: 'Este correo ya está registrado.' });
        }

        const hash = await bcrypt.hash(password, SALT_ROUNDS);

        if (role === 'productor') {
            const result = await pool.query(
                `INSERT INTO users (role, name, last_name, email, password_hash, phone, locality, status, dni, cadastral_ref)
                 VALUES ('PRODUCER', $1, $2, $3, $4, $5, $6, 'UNVERIFIED', $7, $8)
                 RETURNING id`,
                [name, lastName, email, hash, phone || null, address || null, dni || null, catastral || null]
            );
            const id = result.rows[0].id;
            const user = { email, name, role: 'productor', id };
            const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
            res.cookie('km0_jwt', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
            return res.json({ success: true, id });
        } else {
            const result = await pool.query(
                `INSERT INTO users (role, name, last_name, email, password_hash, status)
                 VALUES ('CLIENT', $1, $2, $3, $4, 'UNVERIFIED')
                 RETURNING id`,
                [name, lastName || null, email, hash]
            );
            const id = result.rows[0].id;
            const user = { email, name, role: 'cliente', id };
            const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
            res.cookie('km0_jwt', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
            return res.json({ success: true, id });
        }
    } catch (err) {
        console.error('Error en registro:', err.message);
        res.status(500).json({ success: false, message: 'Error del servidor.' });
    }
});

module.exports = router;
