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
    try {
      if (isEditing) {
        await api.put(`/trades/${trade._id}`, {
          status: formData.status,
          exit: formData.exit
        });
      } else {
        await api.post('/trades', formData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving trade');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-md p-8 rounded-2xl border border-white/10">
        <h3 className="text-2xl font-bold mb-6 text-primary">{isEditing ? 'Close Trade' : 'Post New Trade'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEditing && (
            <>
              <input
                type="text"
                placeholder="Stock Symbol (e.g. NVDA)"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                value={formData.symbol}
                onChange={e => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                required
              />
              <input
                type="text"
                placeholder="Stock Name (e.g. NVIDIA Corporation)"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
              />
              <input
                type="number"
                placeholder="Stock Entry Price"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                value={formData.entry}
                onChange={e => setFormData({...formData, entry: e.target.value})}
                required
              />
            </>
          )}
          <select
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white appearance-none"
            value={formData.status}
            onChange={e => setFormData({...formData, status: e.target.value})}
          >
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
          </select>
          <input
            type="number"
            placeholder="Stock Exit Price"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
            value={formData.exit}
            onChange={e => setFormData({...formData, exit: e.target.value})}
          />
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
              className="flex-1 py-3 px-4 bg-accent-cyan/20 hover:bg-accent-cyan/30 text-accent-cyan border border-accent-cyan/30 rounded-xl font-bold"
            >
              {isEditing ? 'Update' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TradeForm;
