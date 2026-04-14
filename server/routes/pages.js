const express = require('express');
const router = express.Router();
const db = require('../db/mockDb');

// Combine Products with Producer Data
const getProductsWithProducers = () => {
    return db.products.map(prod => {
        const producer = db.producers.find(p => p.id === prod.producer_id);
        return { ...prod, producer_name: producer.name, lat: producer.lat, lng: producer.lng };
    });
};

router.get('/', (req, res) => {
    const products = getProductsWithProducers();
    // In actual app, we would parse JWT from cookies here using a middleware
    // We pass any necessary user logic directly to the view engine
    res.render('index', { products, page: 'home' });
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
    
    res.render('producer-profile', { 
        page: 'producer-profile', 
        producer, 
        products: producerProducts 
    });
});

router.get('/producer-app', (req, res) => {
    res.render('producer-app', { page: 'producer-app' });
});

router.get('/admin-app', (req, res) => {
    res.render('admin-app', { 
        page: 'admin-app',
        producers: db.producers,
        orders: db.orders
    });
});

module.exports = router;
