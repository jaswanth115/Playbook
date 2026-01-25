const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

const User = require('../models/User');

const adminMiddleware = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        console.log(`Admin Check - User: ${user?.email}, Role: ${user?.role}`);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied, admin only' });
        }
        next();
    } catch (err) {
        res.status(500).json({ message: 'Server error during permission check' });
    }
};

module.exports = { authMiddleware, adminMiddleware };
