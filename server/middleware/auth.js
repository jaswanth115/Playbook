const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Explicitly check if user still exists in DB
        const userExists = await User.findById(decoded.id).select('_id');
        if (!userExists) {
            return res.status(401).json({ message: 'User no longer exists, access denied' });
        }

        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};


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
