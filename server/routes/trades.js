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

// 1. Node-Native method (Primary for Vercel/Production)
const getLivePriceNode = async (symbol, exchange = 'NASDAQ') => {
    try {
        let ticker = symbol;
        if (exchange === 'NSE' && !symbol.endsWith('.NS')) {
            ticker = `${symbol}.NS`;
        }
        const result = await yahooFinance.quote(ticker);
        return result.regularMarketPrice || null;
    } catch (err) {
        console.error(`[Node API] Quote Error for ${symbol}:`, err.message);
        return null;
    }
};

// 2. Python method (Primary for Local Dev - more stable against Yahoo blocks)
const getLivePricePython = (symbol, exchange = 'NASDAQ') => {
    return new Promise((resolve) => {
        const scriptPath = path.join(__dirname, '..', 'utils', 'fetch_price.py');
        exec(`python "${scriptPath}" "${symbol}" "${exchange}"`, (error, stdout, stderr) => {
            if (error || stderr) {
                console.error(`[Python Script] Error for ${symbol}:`, error || stderr);
                return resolve(null);
            }
            try {
                const result = JSON.parse(stdout);
                resolve(result.price || null);
            } catch (e) {
                console.error(`[Python Script] JSON Parse Error for ${symbol}:`, e.message);
                resolve(null);
            }
        });
    });
};

// 3. Hybrid Orchestrator
const getLivePrice = async (symbol, exchange = 'NASDAQ') => {
    const isLocal = process.env.NODE_ENV !== 'production' && !process.env.VERCEL;

    if (isLocal) {
        // Local: Try Python first, then fall back to Node
        let price = await getLivePricePython(symbol, exchange);
        if (price) return price;
        console.log(`[Hybrid] Python failed for ${symbol}, trying Node fallback...`);
        return await getLivePriceNode(symbol, exchange);
    } else {
        // Production: Try Node first, then fall back to Python
        let price = await getLivePriceNode(symbol, exchange);
        if (price) return price;
        console.log(`[Hybrid] Node failed for ${symbol}, trying Python fallback...`);
        return await getLivePricePython(symbol, exchange);
    }
};

let isUpdating = false;

// Background Price Update Loop
const updateAllPrices = async () => {
    if (isUpdating) return;
    isUpdating = true;
    try {
        console.log('[BG] Starting synchronized price update...');
        const openTrades = await Trade.find({ status: 'Open' });

        // 1. Group trades by symbol
        const tradeGroups = openTrades.reduce((acc, trade) => {
            if (!acc[trade.symbol]) acc[trade.symbol] = [];
            acc[trade.symbol].push(trade);
            return acc;
        }, {});

        // 2. Process each unique symbol exactly once
        for (const symbol in tradeGroups) {
            const firstTrade = tradeGroups[symbol][0];
            const livePrice = await getLivePrice(symbol, firstTrade.exchange);

            if (livePrice) {
                // 3. Update all trades in this group with the EXACT same price
                await Trade.updateMany(
                    { symbol, status: 'Open' },
                    { currentPrice: livePrice }
                );
                console.log(`[BG] Updated ${symbol} (${tradeGroups[symbol].length} trades): $${livePrice}`);
            }
        }
        console.log('[BG] Synchronized price update completed.');
    } catch (err) {
        console.error('[BG] Error in background price update:', err.message);
    } finally {
        isUpdating = false;
    }
};

// Run background update every 1 second (Disabled on Vercel/Production for Serverless compatibility)
let lastUpdate = 0;
const THROTTLE_TIME = 1000; // 1 second

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    setInterval(updateAllPrices, 1000);
    setTimeout(updateAllPrices, 2000); // Shorter initial delay for 1-sec mode
}

// Get all trades with cached data and user interactions
router.get('/', authMiddleware, async (req, res) => {
    try {
        // Trigger on-demand update in production if throttled
        if ((process.env.NODE_ENV === 'production' || process.env.VERCEL) && Date.now() - lastUpdate > THROTTLE_TIME) {
            console.log('[PROD] Triggering on-demand price update...');
            lastUpdate = Date.now();
            updateAllPrices().catch(err => console.error('[PROD] On-demand update error:', err.message));
        }

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
