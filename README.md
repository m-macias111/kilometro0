# 🌿 Kilómetro 0

> Plataforma de venta directa productor-consumidor de proximidad.  
> Proyecto universitario — Asignatura PATG, 4º TIG, UPM.

**Autores:** Manuel Macias Michel · Nicolás Ronchel Díaz-Leante

---

## Descripción

Kilómetro 0 conecta productores del sector primario (agricultores, ganaderos) con consumidores finales, eliminando intermediarios. El usuario localiza productores cercanos en un mapa interactivo, explora sus productos, hace reservas por packs de kilogramos y recibe un código QR para validar la recogida presencial.

---

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + Express |
| Vistas | EJS (server-side rendering) |
| Base de datos | PostgreSQL + PostGIS (Docker) |
| Driver DB | pg (node-postgres) |
| Autenticación | jsonwebtoken + bcrypt + cookie-parser |
| Emails | nodemailer (Ethereal en desarrollo) |
| QR | qrcode |
| Variables de entorno | dotenv |
| Mapa frontend | Leaflet (CDN) |
| CSS frontend | Bootstrap 5 (CDN) + CSS propio |
| Iconos | Font Awesome (CDN) |
| Dev | nodemon |

---

## Instalación y arranque

### Requisitos previos
- Node.js ≥ 18
- Docker Desktop (para la base de datos)

### 1. Clonar e instalar dependencias

```bash
git clone <url-del-repo>
cd kilometro0
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Edita .env con tus valores (al menos JWT_SECRET)
```

### 3. Arrancar la base de datos (Docker)

```bash
docker-compose up -d
```

Esto levanta un contenedor PostgreSQL con PostGIS en `localhost:5432`.

### 4. Inicializar el esquema y cargar datos de ejemplo

```bash
npm run db:init   # Crea las tablas
npm run db:seed   # Inserta productores, clientes y productos de ejemplo
```

### 5. Arrancar el servidor

```bash
npm run dev    # Desarrollo (con nodemon, recarga automática)
npm start      # Producción
```

Abre [http://localhost:3000](http://localhost:3000)

---

## Credenciales de prueba (tras ejecutar el seed)

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Admin | admin@admin | admin |
| Productor | jarama@test.com | 123 |
| Productor | avila@test.com | 123 |
| Cliente | carlos@test.com | 123 |
| Cliente | ana@test.com | 123 |

---

## Estructura del proyecto

```
kilometro0/
├── .env                        # Variables de entorno (no subir a Git)
├── .env.example                # Plantilla de variables
├── .gitignore
├── docker-compose.yml          # PostgreSQL + PostGIS
├── package.json
├── server/
│   ├── server.js               # Punto de entrada, middleware, arranque
│   ├── config/
│   │   ├── db.js               # Pool de conexión pg
│   │   └── email.js            # Configuración nodemailer
│   ├── middleware/
│   │   └── auth.js             # JWT verify, requireAuth(role)
│   ├── routes/
│   │   ├── pages.js            # Rutas GET que renderizan vistas EJS
│   │   ├── auth.js             # POST /api/login, /register, /logout
│   │   ├── producers.js        # API productores + favoritos
│   │   ├── orders.js           # API pedidos + email + validación QR
│   │   └── admin.js            # API admin (bloquear, cancelar, verificar)
│   └── db/
│       ├── schema.sql          # CREATE TABLES con PostGIS
│       └── seed.js             # Script de datos de ejemplo
├── public/
│   └── css/
│       └── style.css
└── views/
    ├── partials/
    │   ├── head.ejs            # <head> compartido (CSS, fonts)
    │   └── footer.ejs          # Bootstrap JS
    ├── index.ejs               # Landing + mapa + catálogo
    ├── about.ejs               # Información, FAQ
    ├── login.ejs               # Formulario login
    ├── register.ejs            # Registro (cliente/productor)
    ├── producer-profile.ejs    # Perfil público del productor
    ├── producer-app.ejs        # Dashboard del productor
    ├── client-app.ejs          # Dashboard del cliente
    └── admin-app.ejs           # Panel de administración
```

---

## Funcionalidades principales

- **Mapa interactivo** con Leaflet — localiza productores cercanos
- **Filtros** por categoría, texto y radio de distancia (geolocalización)
- **Carrito** persistente en localStorage
- **Checkout** autenticado o como invitado (email requerido)
- **QR por pedido** — generado en servidor y enviado por email
- **Validación de recogida** — el productor escanea/introduce el QR para completar el pedido
- **Favoritos** — los clientes guardan productos favoritos
- **Dashboard productor** — gestión de productos, pedidos y perfil
- **Dashboard cliente** — historial de pedidos, favoritos, perfil
- **Panel admin** — verificación de productores, bloqueo de usuarios, cancelación de pedidos
- **Contraseñas hasheadas** con bcrypt
- **JWT httpOnly cookies** — autenticación segura sin exponer tokens al JS del cliente
