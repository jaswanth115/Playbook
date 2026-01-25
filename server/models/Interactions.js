const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
    tradeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trade', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const investSchema = new mongoose.Schema({
    tradeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trade', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const Like = mongoose.model('Like', likeSchema);
const Invest = mongoose.model('Invest', investSchema);

module.exports = { Like, Invest };
