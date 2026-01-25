import React, { useState } from 'react';
import api from '../api';

const TradeForm = ({ trade, onClose, onSuccess }) => {
  const isEditing = !!trade;
  const [formData, setFormData] = useState(trade || {
    symbol: '',
    name: '',
    status: 'Open',
    entry: '',
    exit: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('TradeForm handleSubmit triggered. isEditing:', isEditing);

    // If closing, enforce status and exit validation
    if (isEditing) {
      if (!formData.exit) {
        console.warn('Validation failed: Closed trade requires an exit price.');
        return alert('Please enter a "Sold at" price to close this trade.');
      }
    }

    try {
      if (isEditing) {
        console.log(`Sending PUT request to /trades/${trade._id} to CLOSE`);
        await api.put(`/trades/${trade._id}`, {
          status: 'Closed',
          exit: parseFloat(formData.exit)
        });
      } else {
        console.log('Sending POST request to /trades as OPEN');
        await api.post('/trades', {
          ...formData,
          status: 'Open',
          entry: parseFloat(formData.entry)
        });
      }
      
      console.log('Request successful!');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('API Error details:', err.response || err);
      alert(err.response?.data?.message || 'Error saving trade. Check console for details.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md p-8 rounded-2xl border border-white/10 bg-card">
        <h3 className="text-2xl font-bold mb-6 text-primary">{isEditing ? 'Close Trade' : 'Post New Trade'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEditing ? (
            <>
              <input
                type="text"
                placeholder="Stock Symbol (e.g. NVDA)"
                className="w-full px-4 py-3 bg-dark border border-white/10 rounded-xl text-white"
                value={formData.symbol}
                onChange={e => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                required
              />
              <input
                type="text"
                placeholder="Stock Name (e.g. NVIDIA Corporation)"
                className="w-full px-4 py-3 bg-dark border border-white/10 rounded-xl text-white"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
              />
              <input
                type="number"
                placeholder="Stock Entry Price"
                className="w-full px-4 py-3 bg-dark border border-white/10 rounded-xl text-white"
                value={formData.entry}
                onChange={e => setFormData({...formData, entry: e.target.value})}
                required
                step="0.01"
              />
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                 <p className="text-xs text-secondary mb-1">Closing Trade for</p>
                 <p className="text-xl font-bold text-white">{trade.symbol}</p>
                 <p className="text-xs text-accent-cyan">Bought at: ${trade.entry}</p>
              </div>
              <input
                type="number"
                placeholder="Stock Exit Price (Sold at)"
                className="w-full px-4 py-3 bg-dark border border-white/10 rounded-xl text-white"
                value={formData.exit}
                onChange={e => setFormData({...formData, exit: e.target.value})}
                required
                step="0.01"
              />
            </div>
          )}
          
          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 rounded-xl text-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${isEditing ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30' : 'bg-accent-cyan/20 hover:bg-accent-cyan/30 text-accent-cyan border border-accent-cyan/30'}`}
            >
              {isEditing ? 'Close Trade' : 'Post Trade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TradeForm;
