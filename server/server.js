const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// ── View Engine ─────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// ── Middleware ──────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

// Inyectar getSessionUser en todas las peticiones
const { getSessionUser } = require('./middleware/auth');
app.use((req, res, next) => {
    req.getSessionUser = () => getSessionUser(req);
    next();
});

// ── Rutas API ───────────────────────────────────────────────────
app.use(require('./routes/auth'));
app.use(require('./routes/producers'));
app.use(require('./routes/orders'));
app.use(require('./routes/admin'));

// ── Rutas de páginas (SSR con EJS) ──────────────────────────────
app.use(require('./routes/pages'));

// ── Arranque ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

require('./config/email').init().then(() => {
    app.listen(PORT, () => {
        console.log(`🌿 Kilómetro 0 corriendo en http://localhost:${PORT}`);
    });
});
