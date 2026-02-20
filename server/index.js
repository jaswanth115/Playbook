require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const tradeRoutes = require('./routes/trades');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Log requests
app.use((req, res, next) => {
    next();
});

// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is reachable', time: new Date() });
});

app.use('/api/auth', authRoutes);
app.use('/api/trades', tradeRoutes);

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => { })
    .catch(err => { });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
});

module.exports = app;
