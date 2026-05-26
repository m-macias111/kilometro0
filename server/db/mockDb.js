// Mock DB — Kilómetro 0
const db = {
    producers: [
        // --- MADRID Y ALREDEDORES ---
        { id: 1, name: 'Huerta del Jarama', email: 'jarama@test.com', password: '123', locality: 'San Martín de la Vega, Madrid', lat: 40.2128, lng: -3.5732, phone: '+34 600111222', verified: true, lastName: 'García Ruiz', history: 'Nuestra huerta familiar lleva más de 40 años cultivando tomates, pimientos y lechugas a orillas del río Jarama. Riego por goteo y cero pesticidas.', profileImage: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400', isBlocked: false },
        { id: 2, name: 'Granja Ávila Orgánica', email: 'avila@test.com', password: '123', locality: 'Navalcarnero, Madrid', lat: 40.2890, lng: -3.9310, phone: '+34 611222333', verified: true, lastName: 'Martín López', history: 'Granja ecológica certificada. Criamos gallinas en libertad y cultivamos hortalizas de temporada en 12 hectáreas de campo abierto.', profileImage: 'https://images.unsplash.com/photo-1516253593875-bd7ba052b734?w=400', isBlocked: false },
        { id: 3, name: 'Quesería Sierra Norte', email: 'queso@test.com', password: '123', locality: 'Rascafría, Madrid', lat: 40.9040, lng: -3.8720, phone: '+34 622333444', verified: true, lastName: 'Pascual Sanz', history: 'Elaboramos quesos artesanales con leche cruda de nuestras propias cabras que pastan libres en la Sierra de Guadarrama. Premiados en 2024.', profileImage: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400', isBlocked: false },
        { id: 4, name: 'Miel Sierra de Madrid', email: 'miel@test.com', password: '123', locality: 'Miraflores de la Sierra, Madrid', lat: 40.8140, lng: -3.7680, phone: '+34 633444555', verified: true, lastName: 'Álvarez Díaz', history: 'Apicultores de tercera generación. Nuestras 200 colmenas están en plena Sierra de Madrid, produciendo miel cruda de romero, tomillo y encina.', profileImage: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400', isBlocked: false },
        { id: 5, name: 'Carnes Valle del Lozoya', email: 'carne@test.com', password: '123', locality: 'Buitrago del Lozoya, Madrid', lat: 40.9880, lng: -3.6350, phone: '+34 644555666', verified: true, lastName: 'López Herrero', history: 'Ganadería extensiva de vacuno y cerdo ibérico en el Valle del Lozoya. Bienestar animal garantizado y sacrificio en matadero local.', profileImage: 'https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=400', isBlocked: false },
        { id: 6, name: 'Bodega Arganda', email: 'vino@test.com', password: '123', locality: 'Arganda del Rey, Madrid', lat: 40.3010, lng: -3.4890, phone: '+34 655666777', verified: true, lastName: 'Ruiz Fernández', history: 'Viñedos centenarios en la D.O. Vinos de Madrid. Elaboramos tintos, blancos y rosados con variedades autóctonas como Malvar y Garnacha.', profileImage: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=400', isBlocked: false },
        { id: 7, name: 'Huevos de Campo Chinchón', email: 'huevos@test.com', password: '123', locality: 'Chinchón, Madrid', lat: 40.1400, lng: -3.4190, phone: '+34 666777888', verified: true, lastName: 'Moreno Gil', history: 'Gallinas camperas alimentadas con pienso ecológico y libertad total. Huevos frescos recogidos cada mañana, del corral a tu mesa en 24h.', profileImage: 'https://images.unsplash.com/photo-1569127959161-2b1297b2d9a6?w=400', isBlocked: false },
        { id: 8, name: 'Aceites de Villaconejos', email: 'aceite@test.com', password: '123', locality: 'Villaconejos, Madrid', lat: 40.1050, lng: -3.4820, phone: '+34 677888999', verified: true, lastName: 'Jiménez Torres', history: 'Olivares tradicionales de la variedad Cornicabra. Prensado en frío en nuestra almazara familiar. Aceite de oliva virgen extra con D.O. Madrid.', profileImage: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400', isBlocked: false },
        // --- RESTO DE ESPAÑA ---
        { id: 9, name: 'Huerta Valenciana', email: 'naranjas@test.com', password: '123', locality: 'Carcaixent, Valencia', lat: 39.1230, lng: -0.4430, phone: '+34 688999000', verified: true, lastName: 'Ferrer Blasco', history: 'Cítricos con denominación de origen de la Ribera del Xúquer. Naranjas y mandarinas recolectadas por la mañana y enviadas el mismo día.', profileImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400', isBlocked: false },
        { id: 10, name: 'Conservas del Cantábrico', email: 'conservas@test.com', password: '123', locality: 'Santoña, Cantabria', lat: 43.4430, lng: -3.4580, phone: '+34 699000111', verified: true, lastName: 'Gómez Pardo', history: 'Anchoas y bonito del norte preparados artesanalmente en nuestro obrador de Santoña. Tradición marinera desde 1952.', profileImage: 'https://images.unsplash.com/photo-1534483509719-8a22baa3789c?w=400', isBlocked: false }
    ],
    clients: [
        { id: 1, name: 'Carlos', lastName: 'Ruiz', email: 'carlos@test.com', password: '123', isBlocked: false },
        { id: 2, name: 'Ana', lastName: 'López', email: 'ana@test.com', password: '123', isBlocked: false },
        { id: 3, name: 'María', lastName: 'Santos', email: 'maria@test.com', password: '123', isBlocked: false }
    ],
    products: [
        // HUERTA DEL JARAMA (id:1)
        { id: 1, producer_id: 1, name: 'Pack Tomates Rosa 5kg', category: 'Verduras', price: 12.50, kg: 5.0, pickup_day: 'Viernes', image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800' },
        { id: 2, producer_id: 1, name: 'Cesta Verduras Temporada 8kg', category: 'Verduras', price: 18.00, kg: 8.0, pickup_day: 'Viernes', image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800' },
        { id: 3, producer_id: 1, name: 'Pimientos Padrón 1kg', category: 'Verduras', price: 6.00, kg: 1.0, pickup_day: 'Miércoles', image_url: 'https://images.unsplash.com/photo-1595856461972-749e39bf09cb?w=800' },
        { id: 4, producer_id: 1, name: 'Lechugas Variadas Pack x6', category: 'Verduras', price: 4.50, kg: 2.0, pickup_day: 'Lunes', image_url: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=800' },
        // GRANJA ÁVILA (id:2)
        { id: 5, producer_id: 2, name: 'Cesta Ecológica Semanal', category: 'Verduras', price: 22.00, kg: 6.0, pickup_day: 'Sábado', image_url: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800' },
        { id: 6, producer_id: 2, name: 'Calabacines Ecológicos 3kg', category: 'Verduras', price: 5.50, kg: 3.0, pickup_day: 'Miércoles', image_url: 'https://images.unsplash.com/photo-1563252722-6434563a3089?w=800' },
        { id: 7, producer_id: 2, name: 'Zanahorias Frescas 2kg', category: 'Verduras', price: 3.80, kg: 2.0, pickup_day: 'Miércoles', image_url: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=800' },
        // QUESERÍA SIERRA NORTE (id:3)
        { id: 8, producer_id: 3, name: 'Queso Curado de Cabra 1kg', category: 'Lácteos', price: 18.50, kg: 1.0, pickup_day: 'Viernes', image_url: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=800' },
        { id: 9, producer_id: 3, name: 'Queso Semicurado 500g', category: 'Lácteos', price: 9.90, kg: 0.5, pickup_day: 'Viernes', image_url: 'https://images.unsplash.com/photo-1559561853-08451507cbe7?w=800' },
        { id: 10, producer_id: 3, name: 'Yogur Artesano de Cabra 1L', category: 'Lácteos', price: 4.50, kg: 1.0, pickup_day: 'Martes', image_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800' },
        // MIEL SIERRA DE MADRID (id:4)
        { id: 11, producer_id: 4, name: 'Miel de Romero 1kg', category: 'Miel', price: 12.00, kg: 1.0, pickup_day: 'Lunes', image_url: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800' },
        { id: 12, producer_id: 4, name: 'Miel de Encina 500g', category: 'Miel', price: 8.50, kg: 0.5, pickup_day: 'Lunes', image_url: 'https://images.unsplash.com/photo-1587049352851-8d4e89134a66?w=800' },
        { id: 13, producer_id: 4, name: 'Polen Fresco 250g', category: 'Miel', price: 9.00, kg: 0.25, pickup_day: 'Miércoles', image_url: 'https://images.unsplash.com/photo-1599839619722-39751411ea63?w=800' },
        // CARNES VALLE DEL LOZOYA (id:5)
        { id: 14, producer_id: 5, name: 'Chuletón de Ternera 1.2kg', category: 'Carnes', price: 32.00, kg: 1.2, pickup_day: 'Jueves', image_url: 'https://images.unsplash.com/photo-1558030006-450675393462?w=800' },
        { id: 15, producer_id: 5, name: 'Carne Picada Ecológica 1kg', category: 'Carnes', price: 14.50, kg: 1.0, pickup_day: 'Jueves', image_url: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=800' },
        { id: 16, producer_id: 5, name: 'Secreto Ibérico 800g', category: 'Carnes', price: 19.00, kg: 0.8, pickup_day: 'Jueves', image_url: 'https://images.unsplash.com/photo-1544025162-836b761619cd?w=800' },
        // BODEGA ARGANDA (id:6)
        { id: 17, producer_id: 6, name: 'Tinto Crianza 6 botellas', category: 'Bebidas', price: 42.00, kg: 6.0, pickup_day: 'Viernes', image_url: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800' },
        { id: 18, producer_id: 6, name: 'Blanco Malvar 2 botellas', category: 'Bebidas', price: 16.00, kg: 2.0, pickup_day: 'Viernes', image_url: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=800' },
        { id: 19, producer_id: 6, name: 'Rosado Garnacha Botella', category: 'Bebidas', price: 8.50, kg: 1.0, pickup_day: 'Viernes', image_url: 'https://images.unsplash.com/photo-1585553616435-2dc0a54e271d?w=800' },
        // HUEVOS CHINCHÓN (id:7)
        { id: 20, producer_id: 7, name: 'Huevos Camperos Docena', category: 'Otros', price: 4.80, kg: 0.8, pickup_day: 'Martes y Viernes', image_url: 'https://images.unsplash.com/photo-1569127959161-2b1297b2d9a6?w=800' },
        { id: 21, producer_id: 7, name: 'Huevos XL Pack 30 uds.', category: 'Otros', price: 11.00, kg: 2.0, pickup_day: 'Viernes', image_url: 'https://images.unsplash.com/photo-1498654077810-12c21d4d6dc3?w=800' },
        // ACEITES VILLACONEJOS (id:8)
        { id: 22, producer_id: 8, name: 'AOVE Cornicabra 1L', category: 'Otros', price: 9.50, kg: 1.0, pickup_day: 'Sábado', image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800' },
        { id: 23, producer_id: 8, name: 'AOVE Premium Edición Limitada 500ml', category: 'Otros', price: 14.00, kg: 0.5, pickup_day: 'Sábado', image_url: 'https://images.unsplash.com/photo-1545231027-637d2f6210f8?w=800' },
        // HUERTA VALENCIANA (id:9)
        { id: 24, producer_id: 9, name: 'Naranjas de Zumo 10kg', category: 'Frutas', price: 14.00, kg: 10.0, pickup_day: 'Sábado', image_url: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=800' },
        { id: 25, producer_id: 9, name: 'Mandarinas Clementinas 5kg', category: 'Frutas', price: 9.00, kg: 5.0, pickup_day: 'Sábado', image_url: 'https://images.unsplash.com/photo-1550258859-d088c27e2815?w=800' },
        { id: 26, producer_id: 9, name: 'Limones Ecológicos 3kg', category: 'Frutas', price: 5.50, kg: 3.0, pickup_day: 'Viernes', image_url: 'https://images.unsplash.com/photo-1590502593747-422896500473?w=800' },
        // CONSERVAS DEL CANTÁBRICO (id:10)
        { id: 27, producer_id: 10, name: 'Anchoas del Cantábrico 8 filetes', category: 'Otros', price: 12.00, kg: 0.1, pickup_day: 'Lunes a Viernes', image_url: 'https://images.unsplash.com/photo-1534483509719-8a22baa3789c?w=800' },
        { id: 28, producer_id: 10, name: 'Bonito del Norte en Aceite 250g', category: 'Otros', price: 8.50, kg: 0.25, pickup_day: 'Lunes a Viernes', image_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800' }
    ],
    orders: []
};

module.exports = db;
module.exports.save = function() {}; // no-op for in-memory mode
