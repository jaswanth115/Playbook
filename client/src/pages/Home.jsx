import React, { useEffect, useState } from 'react';
import api from '../api';
import StockChart from '../components/StockChart';
import TradeForm from '../components/TradeForm';
import CandleLoader from '../components/CandleLoader';
import { Heart, TrendingUp, MessageSquare, Plus, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const [trades, setTrades] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [activeTab, setActiveTab] = useState('Open');
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const commentsEndRef = React.useRef(null);
  
  const user = JSON.parse(localStorage.getItem('user'));
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchData = async () => {
    try {
      const [tradesRes, commentsRes] = await Promise.all([
        api.get('/trades'),
        api.get('/trades/comments/all')
      ]);
      setTrades(tradesRes.data.trades);
      setUserCount(tradesRes.data.userCount);
      setComments(commentsRes.data);
    } catch (err) {
      console.log('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds for live data
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleInteraction = async (e, tradeId, type) => {
    e.stopPropagation();
    try {
      await api.post('/trades/interact', { tradeId, type });
      fetchData();
    } catch (err) {
      console.error('Interaction failed', err);
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    try {
      const tradeId = trades[0]?._id; 
      if (tradeId) {
        await api.post(`/trades/${tradeId}/comment`, { comment: commentText });
        fetchData(); // Refresh all comments from DB
      }
      setCommentText('');
    } catch (err) {
      console.error('Failed to post comment', err);
    }
  };

  const filteredTrades = trades.filter(t => {
    if (activeTab === 'Open') return t.status === 'Open';
    if (activeTab === 'Closed') return t.status === 'Closed';
    return true;
  });

  const sortedTrades = [...filteredTrades].sort((a, b) => {
    if (activeTab === 'Most Liked') return (b.likesCount || 0) - (a.likesCount || 0);
    if (activeTab === 'Most Invested') return (b.investsCount || 0) - (a.investsCount || 0);
    return 0;
  });

  return (
    <div className="min-h-screen bg-dark text-white flex flex-col">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-white/10 sticky top-0 bg-dark/80 backdrop-blur-md z-40">
        <h1 className="text-2xl font-bold tracking-tighter cursor-pointer" onClick={() => navigate('/')}>Playbook</h1>
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
            <p className="text-secondary text-sm">Followers {userCount > 1000 ? `${(userCount / 1000).toFixed(1)}K` : userCount}</p>
          </div>

          {loading ? (
            <div className="py-20">
              <CandleLoader />
              <p className="text-center text-xs text-secondary mt-4 animate-pulse">Syncing with markets...</p>
            </div>
          ) : (
            sortedTrades.map((trade) => {
              const pnl = trade.status === 'Open' 
                ? ((trade.currentPrice - trade.entry) / trade.entry * 100).toFixed(2)
                : ((trade.exit - trade.entry) / trade.entry * 100).toFixed(2);
              
              return (
                <div 
                  key={trade._id}
                  onClick={() => setSelectedSymbol(trade.symbol)}
                  className="group relative flex items-center justify-between p-6 rounded-2xl border border-white/10 hover:border-white/20 transition-all cursor-pointer overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-accent-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="flex items-center gap-6 z-10 w-1/3">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-secondary font-mono mb-1">
                        {trade.status === 'Open' ? 'Bought on' : 'Sold on'} {new Date(trade.status === 'Open' ? trade.createdAt : trade.updatedAt).toLocaleDateString()} {new Date(trade.status === 'Open' ? trade.createdAt : trade.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <h3 className="text-2xl font-bold">{trade.symbol}</h3>
                      <p className="text-xs text-secondary">{trade.name}</p>
                    </div>
                  </div>

                  {trade.status === 'Closed' && (
                    <div className="absolute top-4 right-4">
                      <span className="text-[9px] font-bold px-2 py-1 bg-white/10 rounded-md text-secondary uppercase tracking-widest">Closed</span>
                    </div>
                  )}

                  <div className="flex flex-1 justify-around items-center z-10">
                    <div className="text-center">
                      <p className="text-[10px] text-secondary uppercase tracking-widest">{trade.status === 'Open' ? 'Bought at' : 'Sold at'}</p>
                      <p className="text-lg font-semibold">${trade.status === 'Open' ? trade.entry : trade.exit}</p>
                      {trade.status === 'Open' && (
                         <p className="text-[10px] text-accent-cyan">Live: ${trade.currentPrice?.toFixed(2)}</p>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-secondary uppercase tracking-widest">P&L</p>
                      <p className={`font-bold ${parseFloat(pnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {parseFloat(pnl) >= 0 ? '+' : ''}{pnl}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 z-10 ml-4">
                    <div 
                      onClick={(e) => handleInteraction(e, trade._id, 'invest')}
                      className="flex items-center gap-2 group/btn cursor-pointer"
                    >
                      <div className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${trade.userInvested ? 'bg-gradient-to-br from-accent-cyan to-accent-purple border-transparent' : 'border-white/10 group-hover/btn:border-accent-cyan/50'}`}>
                         <TrendingUp size={14} className={trade.userInvested ? 'text-white' : 'text-secondary'} />
                      </div>
                      <div>
                        <p className="text-[10px] text-secondary">Invested</p>
                        <p className="text-sm font-bold">{trade.investsCount || 0}</p>
                      </div>
                    </div>
                    <div 
                      onClick={(e) => handleInteraction(e, trade._id, 'like')}
                      className="flex items-center gap-2 group/btn cursor-pointer"
                    >
                      <div className={`p-2 rounded-full transition-all ${trade.userLiked ? 'bg-accent-purple/20' : 'bg-white/5 group-hover/btn:bg-white/10'}`}>
                        <Heart size={18} className={trade.userLiked ? 'text-accent-purple fill-accent-purple' : 'text-secondary'} />
                      </div>
                      <div>
                        <p className="text-[10px] text-secondary">Liked</p>
                        <p className="text-sm font-bold">{trade.likesCount || 0}</p>
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
              );
            })
          )}
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-white/10 sticky top-24">
            <h4 className="text-sm font-bold mb-4">Post your Thought</h4>
            <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <div className="py-10">
                  <CandleLoader />
                </div>
              ) : (
                comments.map((c, i) => (
                  <div key={i} className="p-3 rounded-xl text-xs border border-white/5 text-secondary">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-accent-cyan font-bold">{c.userId?.username || 'User'} <span className="text-[10px] text-secondary font-normal opacity-70">({c.userId?.email})</span></p>
                      <p className="text-[9px] text-secondary whitespace-nowrap ml-2">
                         {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <p className="text-primary leading-relaxed">{c.comment}</p>
                  </div>
                ))
              )}
              <div ref={commentsEndRef} />
            </div>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Post........."
                className="w-full px-4 py-3 bg-dark border border-white/10 rounded-xl text-white outline-none pr-10"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
              />
              <button 
                onClick={handlePostComment}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-white"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        </div>
      </main>

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
          onSuccess={fetchData}
        />
      )}
    </div>
  );
};

export default Home;
