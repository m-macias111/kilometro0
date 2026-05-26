const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_km0';

function getSessionUser(req) {
    try {
        const token = req.cookies.km0_jwt;
        if (!token) return null;
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        return null;
    }
}

function requireAuth(role) {
    return (req, res, next) => {
        const user = getSessionUser(req);
        if (!user) return res.redirect('/login');
        if (role && user.role !== role) return res.redirect('/');
        req.user = user;
        next();
    };
}

module.exports = { getSessionUser, requireAuth, JWT_SECRET };
