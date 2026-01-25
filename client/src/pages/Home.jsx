import React, { useEffect, useState } from 'react';
import api from '../api';
import StockChart from '../components/StockChart';
import TradeForm from '../components/TradeForm';
import { Heart, TrendingUp, MessageSquare, Plus, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const [trades, setTrades] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [activeTab, setActiveTab] = useState('Open');
  const user = JSON.parse(localStorage.getItem('user'));
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();

  const fetchTrades = async () => {
    try {
      const { data } = await api.get('/trades');
      setTrades(data);
    } catch (err) {
      console.error('Failed to fetch trades', err);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const filteredTrades = trades.filter(t => {
    if (activeTab === 'Open') return t.status === 'Open';
    if (activeTab === 'Closed') return t.status === 'Closed';
    return true;
  });

  return (
    <div className="min-h-screen bg-dark text-white flex flex-col">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-white/10 sticky top-0 bg-dark/80 backdrop-blur-md z-40">
        <h1 className="text-2xl font-bold tracking-tighter">Playbook</h1>
        <div className="flex gap-8 text-sm font-medium text-secondary">
          <button onClick={() => setActiveTab('Open')} className={activeTab === 'Open' ? 'text-white border-b-2 border-white pb-1' : ''}>Open</button>
          <button onClick={() => setActiveTab('Most Liked')} className={activeTab === 'Most Liked' ? 'text-white border-b-2 border-white pb-1' : ''}>Most Liked</button>
          <button onClick={() => setActiveTab('Most Invested')} className={activeTab === 'Most Invested' ? 'text-white border-b-2 border-white pb-1' : ''}>Most Invested</button>
          <button onClick={() => setActiveTab('Closed')} className={activeTab === 'Closed' ? 'text-white border-b-2 border-white pb-1' : ''}>Closed</button>
          {isAdmin && (
            <button 
              onClick={() => {setEditingTrade(null); setShowForm(true)}}
              className="flex items-center gap-1 text-accent-cyan hover:text-white"
            >
              Post <Plus size={16} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm">{user?.username}</span>
          <button onClick={handleLogout} className="p-2 hover:bg-white/5 rounded-full"><LogOut size={18} /></button>
        </div>
      </nav>

      <main className="flex-1 max-w-6xl w-full mx-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="text-center mb-8">
            <p className="text-secondary text-sm">Followers 130K</p>
          </div>

          {filteredTrades.map((trade) => (
            <div 
              key={trade._id}
              onClick={() => setSelectedSymbol(trade.symbol)}
              className="group relative flex items-center justify-between p-6 bg-card rounded-2xl border border-white/10 hover:border-white/20 transition-all cursor-pointer overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-accent-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex items-center gap-6 z-10">
                <span className="text-xs text-secondary font-mono">#{trade._id.slice(-6)}</span>
                <div>
                  <h3 className="text-2xl font-bold">{trade.symbol}</h3>
                  <p className="text-xs text-secondary">{trade.name}</p>
                </div>
              </div>

              <div className="flex-1 flex justify-around items-center z-10 px-8">
                <div>
                  <p className="text-[10px] text-secondary uppercase tracking-widest">{trade.status === 'Open' ? 'Bought at' : 'Sold at'}</p>
                  <p className="text-lg font-semibold">${trade.status === 'Open' ? trade.entry : trade.exit}</p>
                </div>
                <div>
                  <p className="text-[10px] text-secondary uppercase tracking-widest">P&L</p>
                  <p className="text-green-400 font-bold">+12%</p>
                </div>
              </div>

              <div className="flex items-center gap-6 z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-cyan to-accent-purple" />
                  <div>
                    <p className="text-[10px] text-secondary">Invested</p>
                    <p className="text-sm font-bold">36</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-white/5"><Heart size={18} className="text-secondary" /></div>
                  <div>
                    <p className="text-[10px] text-secondary">Liked</p>
                    <p className="text-sm font-bold">2</p>
                  </div>
                </div>
                {isAdmin && trade.status === 'Open' && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTrade(trade);
                      setShowForm(true);
                    }}
                    className="ml-4 px-4 py-2 bg-white/10 hover:bg-green-500/20 text-white rounded-lg text-xs"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar / Comments */}
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-2xl border border-white/10 sticky top-24">
            <h4 className="text-sm font-bold mb-4">Post your Thought</h4>
            <div className="space-y-4 mb-6">
              <div className="p-3 bg-white/5 rounded-xl text-xs">
                <p className="text-secondary mb-1">UserEmail</p>
                <p>Good idea</p>
              </div>
            </div>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Post........."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none pr-10"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-white">
                <Plus size={18} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {selectedSymbol && (
        <StockChart 
          symbol={selectedSymbol} 
          onClose={() => setSelectedSymbol(null)} 
        />
      )}

      {showForm && (
        <TradeForm 
          trade={editingTrade} 
          onClose={() => setShowForm(false)} 
          onSuccess={fetchTrades}
        />
      )}
    </div>
  );
};

export default Home;
