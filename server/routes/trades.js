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

// Background Price Update Loop
const updateAllPrices = async () => {
    try {
        console.log('[BG] Starting background price update...');
        const openTrades = await Trade.find({ status: 'Open' });

        for (const trade of openTrades) {
            const livePrice = await getLivePrice(trade.symbol, trade.exchange);
            if (livePrice) {
                await Trade.findByIdAndUpdate(trade._id, { currentPrice: livePrice });
                console.log(`[BG] Updated ${trade.symbol}: $${livePrice}`);
            }
        }
        console.log('[BG] Background price update completed.');
    } catch (err) {
        console.error('[BG] Error in background price update:', err.message);
    }
};

// Run background update every 30 seconds
setInterval(updateAllPrices, 30000);
// Initial run
setTimeout(updateAllPrices, 5000);

// Get all trades with cached data and user interactions
router.get('/', authMiddleware, async (req, res) => {
    try {
        // 1. Fetch all trades from DB
        const trades = await Trade.find().sort({ createdAt: -1 }).lean();

        // 2. Enhance trades with interaction data (optimized)
        const enhancedTrades = await Promise.all(trades.map(async (trade) => {
            // Use cached price if available, fallback to entry/exit
            const currentPrice = trade.currentPrice || (trade.status === 'Open' ? trade.entry : trade.exit);

            // Get interaction counts
            const [likesCount, investsCount, userLiked, userInvested] = await Promise.all([
                Like.countDocuments({ tradeId: trade._id }),
                Invest.countDocuments({ tradeId: trade._id }),
                Like.exists({ tradeId: trade._id, userId: req.user.id }),
                Invest.exists({ tradeId: trade._id, userId: req.user.id })
            ]);

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
                `
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #ffffff; margin: 0;">${symbol}</h2>
                    <p style="color: #888; margin: 5px 0 0 0;">${name}</p>
                </div>
                <div style="background: #222; border: 1px solid #333; border-radius: 12px; padding: 20px; text-align: center;">
                    <p style="color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0;">Entry Price</p>
                    <p style="color: #00f2fe; font-size: 32px; font-weight: bold; margin: 5px 0;">${entry}</p>
                    <div style="display: inline-block; padding: 4px 12px; background: #00f2fe20; color: #00f2fe; border-radius: 6px; font-size: 12px; font-weight: bold;">STATUS: ${status}</div>
                </div>
                <p style="text-align: center; color: #555; font-size: 11px; margin-top: 20px;">Posted at: ${postedTime}</p>
                `,
                'New Trade Posted'
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
                `
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #ffffff; margin: 0;">${trade.symbol}</h2>
                    <p style="color: #888; margin: 5px 0 0 0;">${trade.name}</p>
                </div>
                <div style="background: #222; border: 1px solid #333; border-radius: 12px; padding: 20px; text-align: center;">
                    <p style="color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0;">New Status</p>
                    <p style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 5px 0;">${status}</p>
                    ${exit ? `
                        <p style="color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 15px 0 0 0;">Exit Price</p>
                        <p style="color: #4facfe; font-size: 32px; font-weight: bold; margin: 5px 0;">${exit}</p>
                    ` : ''}
                </div>
                <p style="text-align: center; color: #555; font-size: 11px; margin-top: 20px;">Updated at: ${closedTime}</p>
                `,
                'Trade Updated'
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
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(comments.reverse());
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
