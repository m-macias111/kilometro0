const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const QRCode = require('qrcode');

dotenv.config();

// Configure View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // No need for signed cookies if using JWT
app.use(cors());

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_km0';

// Serve static assets (CSS, images, JS scripts)
app.use(express.static(path.join(__dirname, '../public')));

// ── JWT AUTH MIDDLEWARE ─────────────────────────────────────────
function getSessionUser(req) {
    try {
        const token = req.cookies.km0_jwt;
        if(!token) return null;
        return jwt.verify(token, JWT_SECRET);
    } catch(e) { return null; }
}

function requireAuth(role) {
    return (req, res, next) => {
        const user = getSessionUser(req);
        if(!user) return res.redirect('/login');
        if(role && user.role !== role) return res.redirect('/');
        req.user = user;
        next();
    };
}

// Make getSessionUser available to routes
app.use((req, res, next) => {
    req.getSessionUser = () => getSessionUser(req);
    next();
});

// Routers
const pagesRouter = require('./routes/pages');
app.use('/', pagesRouter);

// ── EMAIL SETUP ────────────────────────────────────────────────
const nodemailer = require('nodemailer');
let transporter;
let isTestMode = true;

if(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    isTestMode = false;
    console.log('📧 Email REAL configurado vía ' + process.env.SMTP_HOST);
} else {
    nodemailer.createTestAccount((err, account) => {
        if (err) { console.error('Failed to create Ethereal account: ' + err.message); return; }
        transporter = nodemailer.createTransport({
            host: account.smtp.host, port: account.smtp.port, secure: account.smtp.secure,
            auth: { user: account.user, pass: account.pass }
        });
        console.log('📧 Email en modo TEST (Ethereal). Configura SMTP_HOST en .env para enviar correos reales.');
    });
}

// ── DATABASE ───────────────────────────────────────────────────
const db = require('./db/mockDb');

// ── AUTH ROUTES ────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    // Admin hardcoded
    if(email === 'admin@admin' && password === 'admin') {
        const user = { email, name: 'Administrador', role: 'admin' };
        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
        res.cookie('km0_jwt', token, { httpOnly: true, maxAge: 24*60*60*1000 });
        return res.json({ success: true, user });
    }
    // Check producers
    const producer = db.producers.find(p => p.email === email && p.password === password);
    if(producer) {
        if(producer.isBlocked) return res.json({ success: false, message: 'Tu cuenta ha sido bloqueada por un administrador.' });
        const user = { email, name: producer.name, role: 'productor', id: producer.id };
        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
        res.cookie('km0_jwt', token, { httpOnly: true, maxAge: 24*60*60*1000 });
        return res.json({ success: true, user });
    }
    // Check clients
    const client = db.clients.find(c => c.email === email && c.password === password);
    if(client) {
        if(client.isBlocked) return res.json({ success: false, message: 'Tu cuenta ha sido bloqueada por un administrador.' });
        const user = { email, name: client.name, role: 'cliente', id: client.id };
        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
        res.cookie('km0_jwt', token, { httpOnly: true, maxAge: 24*60*60*1000 });
        return res.json({ success: true, user });
    }
    res.json({ success: false, message: 'Email o contraseña incorrectos.' });
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('km0_jwt');
    res.json({ success: true });
});

app.post('/api/register', (req, res) => {
    const { name, lastName, email, role, password, dni, catastral, address, phone } = req.body;
    if(role === 'productor') {
        const id = db.producers.length ? Math.max(...db.producers.map(p=>p.id)) + 1 : 1;
        db.producers.push({
            id, name, lastName, email, password, locality: address, phone, verified: false, isBlocked: false, dni, catastral, lat: 40.4, lng: -3.7, history: '', profileImage: ''
        });
        db.save();
        const user = { email, name, role: 'productor', id };
        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
        res.cookie('km0_jwt', token, { httpOnly: true, maxAge: 24*60*60*1000 });
        res.json({ success: true, id });
    } else {
        const id = db.clients.length ? Math.max(...db.clients.map(c=>c.id)) + 1 : 1;
        db.clients.push({ id, name, lastName, email, password, isBlocked: false });
        db.save();
        const user = { email, name, role: 'cliente', id };
        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
        res.cookie('km0_jwt', token, { httpOnly: true, maxAge: 24*60*60*1000 });
        res.json({ success: true, id });
    }
});

// ── ORDER ROUTES ───────────────────────────────────────────────
app.post('/api/orders', async (req, res) => {
    const { items, client_email } = req.body;
    const order_id = Date.now().toString();
    const qr_code = "QR_" + order_id;
    const total_price = items.reduce((a,b)=>a+b.price, 0);
    db.orders.push({ order_id, items, client_email, qr_code, status: 'PENDING', total_price });
    db.save();
    
    let emailPreviewUrl = null;
    if(transporter && client_email) {
        const itemsHtml = items.map(i => `<li><b>${i.name}</b> - ${i.price.toFixed(2)}€ (Recoger en: ${i.producer_name})</li>`).join('');
        const qrBuffer = await QRCode.toBuffer(qr_code);
        const mailOptions = {
            from: '"Kilómetro 0 Corporativo" <reservas@km0.es>',
            to: client_email,
            subject: 'Confirmación de Reserva #' + order_id,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
                    <div style="text-align: center; color: #2ecc71;">
                        <h1><span style="font-size: 2rem;">🌿</span> Kilómetro 0</h1>
                    </div>
                    <h2>¡Gracias por tu compra local!</h2>
                    <p>Tu reserva ha sido procesada con éxito. Enséñale el siguiente código QR o la referencia al productor cuando vayas a recoger tu pedido:</p>
                    <div style="text-align: center; margin: 20px 0;">
                        <img src="cid:qrcodeimg" alt="Código QR" style="width: 200px; height: 200px;">
                    </div>
                    <div style="background: #f9f9f9; padding: 15px; text-align: center; border-radius: 8px; font-size: 1.5rem; font-weight: bold; letter-spacing: 2px;">
                        ${qr_code}
                    </div>
                    <h3>Detalles de la compra:</h3>
                    <ul>${itemsHtml}</ul>
                    <h3>Total pagado: ${total_price.toFixed(2)}€</h3>
                    <p>Apoyando a los productores locales haces que el mundo sea un lugar más sostenible.</p>
                </div>
            `,
            attachments: [
                {
                    filename: 'qrcode.png',
                    content: qrBuffer,
                    cid: 'qrcodeimg'
                }
            ]
        };
        try {
            const info = await transporter.sendMail(mailOptions);
            if(isTestMode) {
                emailPreviewUrl = nodemailer.getTestMessageUrl(info);
                console.log('--- EMAIL CAPTURADO (Ethereal) ---');
                console.log('Preview URL: %s', emailPreviewUrl);
            } else {
                console.log('--- EMAIL ENVIADO a ' + client_email + ' ---');
            }
        } catch(e) {
            console.error('Error enviando email:', e.message);
        }
    }

    res.json({ success: true, order_id, qr_code, emailPreviewUrl });
});

// ── PRODUCER API ROUTES ────────────────────────────────────────
app.get('/api/producers/by-email', (req, res) => {
    const email = req.query.email;
    const producer = db.producers.find(p => p.email === email);
    if(producer) {
        // Don't leak password
        const { password, ...safe } = producer;
        res.json({ success: true, producer: safe });
    }
    else res.json({ success: false });
});

app.post('/api/producers/:id/verify', requireAuth('admin'), (req, res) => {
    const producer = db.producers.find(p => p.id === parseInt(req.params.id));
    if(producer) {
        producer.verified = true;
        db.save();
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

app.post('/api/producers/update-profile', (req, res) => {
    const user = getSessionUser(req);
    if(!user || user.role !== 'productor') return res.status(403).json({ success: false });
    const producer = db.producers.find(p => p.email === user.email);
    if(!producer) return res.status(404).json({ success: false });
    
    const { profileImage, history } = req.body;
    if(profileImage !== undefined) producer.profileImage = profileImage;
    if(history !== undefined) producer.history = history;
    db.save();
    res.json({ success: true });
});

app.post('/api/products/add', (req, res) => {
    const user = getSessionUser(req);
    if(!user || user.role !== 'productor') return res.status(403).json({ success: false });
    const producer = db.producers.find(p => p.email === user.email);
    if(!producer) return res.status(404).json({ success: false });
    
    const { name, category, price, kg, pickup_day, image_url } = req.body;
    if(!name || !price) return res.status(400).json({ success: false, message: 'Nombre y precio obligatorios' });
    
    const id = db.products.length ? Math.max(...db.products.map(p=>p.id)) + 1 : 1;
    const product = {
        id,
        producer_id: producer.id,
        name,
        category: category || 'Otros',
        price: parseFloat(price),
        kg: parseFloat(kg) || 1,
        pickup_day: pickup_day || 'Consultar',
        image_url: image_url || 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800'
    };
    db.products.push(product);
    db.save();
    res.json({ success: true, product });
});

app.delete('/api/products/:id', (req, res) => {
    const user = getSessionUser(req);
    if(!user || user.role !== 'productor') return res.status(403).json({ success: false });
    const producer = db.producers.find(p => p.email === user.email);
    if(!producer) return res.status(404).json({ success: false });
    
    const idx = db.products.findIndex(p => p.id === parseInt(req.params.id) && p.producer_id === producer.id);
    if(idx === -1) return res.status(404).json({ success: false });
    db.products.splice(idx, 1);
    db.save();
    res.json({ success: true });
});

// ── ADMIN API ROUTES ───────────────────────────────────────────
app.post('/api/admin/block', requireAuth('admin'), (req, res) => {
    const { type, id, block } = req.body;
    const list = type === 'productor' ? db.producers : db.clients;
    const user = list.find(u => u.id === parseInt(id));
    if(user) {
        user.isBlocked = block;
        db.save();
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

app.post('/api/admin/remove-photo', requireAuth('admin'), (req, res) => {
    const { id } = req.body;
    const producer = db.producers.find(p => p.id === parseInt(id));
    if(producer) {
        producer.profileImage = '';
        db.save();
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

app.post('/api/admin/cancel-order', requireAuth('admin'), (req, res) => {
    const { order_id } = req.body;
    const order = db.orders.find(o => o.order_id === order_id);
    if(order) {
        order.status = 'CANCELLED';
        db.save();
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Node.js MVC Server running on port ${PORT}`);
});
