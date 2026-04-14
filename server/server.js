const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

dotenv.config();

// Configure View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());

// Serve static assets (CSS, images, JS scripts)
app.use(express.static(path.join(__dirname, '../public')));

// Routers
const pagesRouter = require('./routes/pages');
app.use('/', pagesRouter);

const db = require('./db/mockDb');
app.post('/api/orders', (req, res) => {
    // API Route for cart checkout (keeps UI reactive without page reload)
    const { items, client_id } = req.body;
    const order_id = Date.now().toString();
    const qr_code = "QR_" + order_id;
    db.orders.push({ order_id, items, client_id, qr_code, status: 'PENDING', total_price: items.reduce((a,b)=>a+b.price, 0) });
    res.json({ success: true, order_id, qr_code });
});

app.post('/api/producers/:id/verify', (req, res) => {
    const producer = db.producers.find(p => p.id === parseInt(req.params.id));
    if(producer) {
        producer.verified = true;
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

app.post('/api/register', (req, res) => {
    const { name, email, role, dni, catastral, address, phone } = req.body;
    if(role === 'productor') {
        const id = db.producers.length ? Math.max(...db.producers.map(p=>p.id)) + 1 : 1;
        db.producers.push({
            id, name, email, locality: address, phone, verified: false, dni, catastral, lat: 40.4, lng: -3.7
        });
        res.json({ success: true, id });
    } else {
        res.json({ success: true });
    }
});

app.get('/api/producers/by-email', (req, res) => {
    const email = req.query.email;
    const producer = db.producers.find(p => p.email === email);
    if(producer) res.json({ success: true, producer });
    else res.json({ success: false });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Node.js MVC Server running on port ${PORT}`);
});
