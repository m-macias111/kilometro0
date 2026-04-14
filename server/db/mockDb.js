// Mock DB because pg/docker are missing locally
const db = {
    producers: [
        { id: 1, name: 'Granja de Tomates', email: 'granja@test.com', locality: 'Madrid', lat: 40.4168, lng: -3.7038, phone: '123456789', verified: true },
        { id: 2, name: 'Quesería Artesanal', email: 'queso@test.com', locality: 'Barcelona', lat: 41.3851, lng: 2.1734, phone: '987654321', verified: true },
        { id: 3, name: 'Huerta Nueva de Valencia', email: 'naranjas@test.com', locality: 'Valencia', lat: 39.4699, lng: -0.3773, phone: '555123456', verified: false, dni: '12345678Z', catastral: '987654321AB' }
    ],
    products: [
        { id: 1, producer_id: 1, name: 'Pack Tomates Rosa 5kg', price: 12.50, kg: 5.0, pickup_day: 'Viernes', image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop' },
        { id: 2, producer_id: 2, name: 'Pack Queso Curado Oveja', price: 25.00, kg: 2.0, pickup_day: 'Lunes a Viernes', image_url: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=800&auto=format&fit=crop' }
    ],
    orders: []
};

module.exports = db;
