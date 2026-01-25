const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
    symbol: { type: String, required: true },
    name: { type: String, required: true },
    status: { type: String, enum: ['Open', 'Closed'], default: 'Open' },
    entry: { type: Number, required: true },
    exit: { type: Number },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Trade', tradeSchema);
