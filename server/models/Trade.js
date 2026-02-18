const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
    symbol: { type: String, required: true },
    name: { type: String, required: true },
    exchange: { type: String, enum: ['NSE', 'NASDAQ'], default: 'NASDAQ' },
    status: { type: String, enum: ['Open', 'Closed'], default: 'Open' },
    entry: { type: Number, required: true },
    exit: { type: Number },
    currentPrice: { type: Number }, // Cached live price
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Trade', tradeSchema);
