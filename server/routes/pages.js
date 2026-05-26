const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_km0';
const db = require('../db/mockDb');

// ── Helpers ────────────────────────────────────────────────────
const getProductsWithProducers = () => {
    return db.products.filter(prod => {
        const producer = db.producers.find(p => p.id === prod.producer_id);
        return producer && producer.verified && !producer.isBlocked;
    }).map(prod => {
        const producer = db.producers.find(p => p.id === prod.producer_id);
        return { ...prod, producer_name: producer.name, lat: producer.lat, lng: producer.lng };
    });
};

const getPublicProducers = () => {
    return db.producers
        .filter(p => p.verified && !p.isBlocked)
        .map(({ password, dni, catastral, ...safe }) => safe);
};

function getSessionUser(req) {
    try {
        const token = req.cookies.km0_jwt;
        if(!token) return null;
        return jwt.verify(token, JWT_SECRET);
    } catch(e) { return null; }
}

// ── PUBLIC ROUTES ──────────────────────────────────────────────
router.get('/', (req, res) => {
    const products = getProductsWithProducers();
    res.render('index', { products, producers: getPublicProducers(), page: 'home' });
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

router.get('/producer-profile', (req, res) => {
    const id = parseInt(req.query.id) || 1;
    const products = getProductsWithProducers();
    const producerProducts = products.filter(p => p.producer_id === id);
    const producer = db.producers.find(p => p.id === id);
    
    // Sanitize producer data for public view
    let safeProducer = null;
    if(producer) {
        const { password, dni, catastral, ...safe } = producer;
        safeProducer = safe;
    }
    
    res.render('producer-profile', { 
        page: 'producer-profile', 
        producer: safeProducer, 
        products: producerProducts 
    });
});

// ── PROTECTED: Producer Dashboard ──────────────────────────────
router.get('/producer-app', (req, res) => {
    const user = getSessionUser(req);
    if(!user || user.role !== 'productor') return res.redirect('/login');
    
    const producer = db.producers.find(p => p.email === user.email);
    if(!producer) return res.redirect('/login');
    
    // Get this producer's products
    const myProducts = db.products.filter(p => p.producer_id === producer.id);
    
    // Get this producer's orders (items that reference their products)
    const myProductIds = myProducts.map(p => p.id);
    const myOrders = db.orders.filter(o => 
        o.items.some(i => myProductIds.includes(i.id))
    );
    
    // Stats
    const totalSales = myOrders.filter(o => o.status !== 'CANCELLED').length;
    const totalRevenue = myOrders
        .filter(o => o.status !== 'CANCELLED')
        .reduce((sum, o) => sum + o.items.filter(i => myProductIds.includes(i.id)).reduce((s, i) => s + i.price, 0), 0);
    const pendingOrders = myOrders.filter(o => o.status === 'PENDING').length;
    
    // Don't send password to template
    const { password, ...safeProducer } = producer;
    
    res.render('producer-app', { 
        page: 'producer-app',
        producer: safeProducer,
        products: myProducts,
        orders: myOrders,
        stats: { totalSales, totalRevenue, pendingOrders }
    });
});

// ── PROTECTED: Admin Dashboard ─────────────────────────────────
router.get('/admin-app', (req, res) => {
    const user = getSessionUser(req);
    if(!user || user.role !== 'admin') return res.redirect('/login');
    
    res.render('admin-app', { 
        page: 'admin-app', 
        producers: db.producers, 
        clients: db.clients, 
        orders: db.orders 
    });
});

module.exports = router;
