const express = require('express');
const router = express.Router();

// Polyfill for getSetCookie on older Node 18 versions (required by yahoo-finance2 v3)
if (typeof Headers !== 'undefined' && !Headers.prototype.getSetCookie) {
    Headers.prototype.getSetCookie = function () {
        return this.get('set-cookie')?.split(', ') || [];
    };
}
const Trade = require('../models/Trade');
const User = require('../models/User');
const { Like, Invest } = require('../models/Interactions');
const Comment = require('../models/Comment');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { sendEmail } = require('../utils/mailer');
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const { exec } = require('child_process');
const path = require('path');

// Helper to fetch price via Python
const getLivePrice = (symbol, exchange = 'NASDAQ') => {
    return new Promise((resolve) => {
        const scriptPath = path.join(__dirname, '..', 'utils', 'fetch_price.py');
        // Pass exchange as second argument
        exec(`python "${scriptPath}" "${symbol}" "${exchange}"`, (error, stdout, stderr) => {
            if (error || stderr) {
                console.error(`Python Error for ${symbol} (${exchange}):`, error || stderr);
                return resolve(null);
            }
            try {
                const result = JSON.parse(stdout);
                resolve(result.price || null);
            } catch (e) {
                console.error(`JSON Parse Error for ${symbol}:`, e.message);
                resolve(null);
            }
        });
    });
};

// Get all trades with live data and user interactions
router.get('/', authMiddleware, async (req, res) => {
    try {
        const trades = await Trade.find().sort({ createdAt: -1 }).lean();


        const enhancedTrades = await Promise.all(trades.map(async (trade) => {
            // Get live price via Python helper
            let currentPrice = trade.exit || trade.entry;
            console.log(`FETCHING quote for ${trade.symbol} via Python...`);

            console.log(`FETCHING quote for ${trade.symbol} (${trade.exchange}) via Python...`);

            const livePrice = await getLivePrice(trade.symbol, trade.exchange);
            if (livePrice) {
                currentPrice = livePrice;
                console.log(`SUCCESS: Live price for ${trade.symbol}: $${currentPrice}`);
            } else {
                console.warn(`WARNING: Python fetch failed for ${trade.symbol}, falling back to Node library.`);
                try {
                    const quote = await yahooFinance.quote(trade.symbol);
                    if (quote && quote.regularMarketPrice) {
                        currentPrice = quote.regularMarketPrice;
                        console.log(`SUCCESS: Node fallback price for ${trade.symbol}: $${currentPrice}`);
                    }
                } catch (nodeErr) {
                    console.error(`CRITICAL: Node fallback also failed for ${trade.symbol}:`, nodeErr.message);
                }
            }

            // Get interaction counts
            const likesCount = await Like.countDocuments({ tradeId: trade._id });
            const investsCount = await Invest.countDocuments({ tradeId: trade._id });

            // Check if user liked/invested
            const userLiked = await Like.exists({ tradeId: trade._id, userId: req.user.id });
            const userInvested = await Invest.exists({ tradeId: trade._id, userId: req.user.id });

            return {
                ...trade,
                currentPrice,
                likesCount,
                investsCount,
                userLiked: !!userLiked,
                userInvested: !!userInvested
            };
        }));

        res.json({ trades: enhancedTrades });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Post a trade (Admin only)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        console.log('POST /trades - Request Body:', req.body);
        const { symbol, name, exchange, status, entry, exit } = req.body;
        const trade = new Trade({ symbol, name, exchange, status, entry, exit, postedBy: req.user.id });
        await trade.save();

        const postedTime = new Date(trade.createdAt).toLocaleString();
        console.log(`Trade ${symbol} saved successfully`);

        // Notify all users
        const users = await User.find({}, 'email');
        const emails = users.map(u => u.email);
        if (emails.length > 0) {
            console.log(`Sending notifications to ${emails.length} users...`);
            await sendEmail(
                emails.join(','),
                `New Trade Alert: ${symbol}`,
                `A new trade has been posted: ${name} (${symbol}). Entry: $${entry}. Posted at: ${postedTime}`,
                `<h1>New Trade Posted</h1><p><b>${name} (${symbol})</b></p><p>Entry: $${entry}</p><p>Status: ${status}</p><p>Posted at: ${postedTime}</p>`
            );
        }

        res.status(201).json(trade);
    } catch (err) {
        console.error('ERROR in POST /trades:', err);
        res.status(500).json({ message: err.message });
    }
});

// Update a trade (Admin only)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        console.log(`PUT /trades/${req.params.id} - Request Body:`, req.body);
        const { status, exit } = req.body;

        // Validation: Exit price required to close trade
        if (status === 'Closed' && !exit) {
            return res.status(400).json({ message: 'Sold at price is required to close the trade' });
        }

        const trade = await Trade.findByIdAndUpdate(req.params.id, { status, exit }, { new: true });
        if (!trade) {
            console.error(`Trade with ID ${req.params.id} not found`);
            return res.status(404).json({ message: 'Trade not found' });
        }

        const closedTime = new Date(trade.updatedAt).toLocaleString();
        console.log(`Trade ${trade.symbol} updated successfully`);

        // Notify all users about update
        const users = await User.find({}, 'email');
        const emails = users.map(u => u.email);
        if (emails.length > 0) {
            console.log(`Sending update notifications to ${emails.length} users...`);
            await sendEmail(
                emails.join(','),
                `Trade Updated: ${trade.symbol}`,
                `Trade ${trade.symbol} has been updated. New Status: ${status}. Updated at: ${closedTime}`,
                `<h1>Trade Updated</h1><p><b>${trade.name} (${trade.symbol})</b></p><p>New Status: ${status}</p><p>Exit: $${exit || 'N/A'}</p><p>Closed at: ${closedTime}</p>`
            );
        }

        res.json(trade);
    } catch (err) {
        console.error(`ERROR in PUT /trades/${req.params.id}:`, err);
        res.status(500).json({ message: err.message });
    }
});

// Get all comments across all trades
router.get('/comments/all', authMiddleware, async (req, res) => {
    try {
        const comments = await Comment.find()
            .populate('userId', 'email username')
            .sort({ createdAt: 1 });
        res.json(comments);
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


// Post global comment (not tied to a specific trade)
router.post('/comment', authMiddleware, async (req, res) => {
    try {
        const comment = new Comment({
            userId: req.user.id,
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
