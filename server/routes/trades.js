const express = require('express');
const router = express.Router();
const Trade = require('../models/Trade');
const User = require('../models/User');
const { Like, Invest } = require('../models/Interactions');
const Comment = require('../models/Comment');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { sendEmail } = require('../utils/mailer');
const yahooFinance = require('yahoo-finance2').default;

// Get all trades
router.get('/', authMiddleware, async (req, res) => {
    try {
        const trades = await Trade.find().sort({ createdAt: -1 });
        res.json(trades);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Post a trade (Admin only)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { symbol, name, status, entry, exit } = req.body;
        const trade = new Trade({ symbol, name, status, entry, exit, postedBy: req.user.id });
        await trade.save();

        // Notify all users
        const users = await User.find({}, 'email');
        const emails = users.map(u => u.email);
        if (emails.length > 0) {
            await sendEmail(
                emails.join(','),
                `New Trade Alert: ${symbol}`,
                `A new trade has been posted: ${name} (${symbol}). Entry: $${entry}`,
                `<h1>New Trade Posted</h1><p><b>${name} (${symbol})</b></p><p>Entry: $${entry}</p><p>Status: ${status}</p>`
            );
        }

        res.status(201).json(trade);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update a trade (Admin only)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { status, exit } = req.body;
        const trade = await Trade.findByIdAndUpdate(req.params.id, { status, exit }, { new: true });

        // Notify all users about update
        const users = await User.find({}, 'email');
        const emails = users.map(u => u.email);
        if (emails.length > 0) {
            await sendEmail(
                emails.join(','),
                `Trade Updated: ${trade.symbol}`,
                `Trade ${trade.symbol} has been updated. New Status: ${status}`,
                `<h1>Trade Updated</h1><p><b>${trade.name} (${trade.symbol})</b></p><p>New Status: ${status}</p><p>Exit: $${exit || 'N/A'}</p>`
            );
        }

        res.json(trade);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Like/Invest Toggle
router.post('/interact', authMiddleware, async (req, res) => {
    try {
        const { tradeId, type } = req.body; // type: 'like' or 'invest'
        const Model = type === 'like' ? Like : Invest;

        const existing = await Model.findOne({ tradeId, userId: req.user.id });
        if (existing) {
            await Model.findByIdAndDelete(existing._id);
            return res.json({ message: 'Interaction removed' });
        }

        const interaction = new Model({ tradeId, userId: req.user.id });
        await interaction.save();
        res.json({ message: 'Interaction added' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get interaction counts
router.get('/:id/interactions', async (req, res) => {
    try {
        const likes = await Like.countDocuments({ tradeId: req.params.id });
        const invests = await Invest.countDocuments({ tradeId: req.params.id });
        res.json({ likes, invests });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Post comment
router.post('/:id/comment', authMiddleware, async (req, res) => {
    try {
        const comment = new Comment({
            userId: req.user.id,
            tradeId: req.params.id,
            comment: req.body.comment
        });
        await comment.save();
        res.json(comment);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get stock history for chart
router.get('/history/:symbol', authMiddleware, async (req, res) => {
    try {
        const symbol = req.params.symbol;
        const queryOptions = { period1: '2025-01-01', interval: '1d' };
        const result = await yahooFinance.historical(symbol, queryOptions);
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
