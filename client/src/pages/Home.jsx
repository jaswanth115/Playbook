import React, { useEffect, useState, useRef } from 'react';
import api from '../api';
import StockChart from '../components/StockChart';
import NumberFlow from '@number-flow/react';
import { Check } from 'lucide-react';
import TradeForm from '../components/TradeForm';
import CandleLoader from '../components/CandleLoader';
import { Heart, TrendingUp, MessageSquare, Plus, LogOut, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const [trades, setTrades] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [activeTab, setActiveTab] = useState('Open');
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const commentsContainerRef = useRef(null);
  
  const user = JSON.parse(localStorage.getItem('user'));
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();

  const prevCommentsLengthRef = useRef(0);

  const scrollToBottom = () => {
    if (commentsContainerRef.current) {
      commentsContainerRef.current.scrollTo({
        top: commentsContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const fetchData = async () => {
    try {
      const [tradesRes, commentsRes] = await Promise.all([
        api.get('/trades'),
        api.get('/trades/comments/all')
      ]);
      setTrades(tradesRes.data.trades);

      setComments(commentsRes.data);
    } catch (err) {
      console.log('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every 2 seconds for live data
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (comments.length > prevCommentsLengthRef.current) {
      scrollToBottom();
    }
    prevCommentsLengthRef.current = comments.length;
  }, [comments]);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isMenuOpen]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleInteraction = async (e, tradeId, type) => {
    e.stopPropagation();
    
    // Optimistic Update
    setTrades(prevTrades => prevTrades.map(t => {
      if (t._id === tradeId) {
        const isLike = type === 'like';
        const userActionKey = isLike ? 'userLiked' : 'userInvested';
        const countKey = isLike ? 'likesCount' : 'investsCount';
        const currentlyActive = t[userActionKey];
        
        return {
          ...t,
          [userActionKey]: !currentlyActive,
          [countKey]: currentlyActive ? (t[countKey] || 1) - 1 : (t[countKey] || 0) + 1
        };
      }
      return t;
    }));

    try {
      await api.post('/trades/interact', { tradeId, type });
      // We don't call fetchData() here anymore to keep it snappy
      // The 2s interval will sync it eventually with ground truth
    } catch (err) {
      console.error('Interaction failed', err);
      // Revert on error if needed, but for simplicity we let the next fetch fix it
      fetchData();
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    
    const newComment = {
      comment: commentText,
      createdAt: new Date().toISOString(),
      userId: {
        username: user?.username || 'You',
        email: user?.email || ''
      }
    };
    
    // Optimistic Update
    setComments(prev => [...prev, newComment]);
    setCommentText('');

    try {
      await api.post('/trades/comment', { comment: commentText });
      // The 2s interval will sync the official ID and data
    } catch (err) {
      console.error('Failed to post comment', err);
      fetchData(); // Sync if failed
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
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-dark/80 backdrop-blur-md z-50">
        <h1 className="text-2xl font-bold tracking-tighter cursor-pointer" onClick={() => navigate('/')}>Playbook</h1>
        
        {/* Desktop Menu */}
        <div className="hidden md:flex gap-8 text-sm font-medium text-secondary">
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
          <div className="hidden md:flex items-center gap-4">
            <span className="text-sm truncate max-w-[150px]">{user?.username}</span>
            <button onClick={handleLogout} className="p-2 hover:bg-white/5 rounded-full"><LogOut size={18} /></button>
          </div>
          
          {/* Hamburger Toggle */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-secondary hover:text-white"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      <div className={`fixed inset-0 z-40 md:hidden transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
        <div className="absolute right-0 top-0 bottom-0 w-64 bg-card border-l border-white/10 p-8 flex flex-col gap-6 shadow-2xl overflow-y-auto">
          <p className="text-xs text-secondary uppercase tracking-widest mb-2 font-bold opacity-50">Navigation</p>
          <button onClick={() => {setActiveTab('Open'); setIsMenuOpen(false)}} className={`text-left text-lg ${activeTab === 'Open' ? 'text-accent-cyan font-bold' : 'text-secondary'}`}>Open Trades</button>
          <button onClick={() => {setActiveTab('Most Liked'); setIsMenuOpen(false)}} className={`text-left text-lg ${activeTab === 'Most Liked' ? 'text-accent-cyan font-bold' : 'text-secondary'}`}>Most Liked</button>
          <button onClick={() => {setActiveTab('Most Invested'); setIsMenuOpen(false)}} className={`text-left text-lg ${activeTab === 'Most Invested' ? 'text-accent-cyan font-bold' : 'text-secondary'}`}>Most Invested</button>
          <button onClick={() => {setActiveTab('Closed'); setIsMenuOpen(false)}} className={`text-left text-lg ${activeTab === 'Closed' ? 'text-accent-cyan font-bold' : 'text-secondary'}`}>Closed Trades</button>
          
          <div className="h-px bg-white/10 my-2" />
          
          {isAdmin && (
            <button 
              onClick={() => {setEditingTrade(null); setShowForm(true); setIsMenuOpen(false)}}
              className="flex items-center gap-2 text-accent-cyan text-lg font-bold"
            >
              <Plus size={20} /> Post New Trade
            </button>
          )}
          
          <div className="mt-auto pt-6 border-t border-white/10 space-y-4">
            <div className="flex flex-col">
              <span className="text-xs text-secondary mb-1 opacity-50">Active User</span>
              <span className="text-sm font-bold truncate">{user?.username}</span>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 text-red-400 font-medium">
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">


          {loading ? (
            <div className="py-20">
              <CandleLoader />
              <p className="text-center text-xs text-secondary mt-4 animate-pulse">Syncing with markets...</p>
            </div>
          ) : sortedTrades.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp size={32} className="text-secondary opacity-30" />
              </div>
              <p className="text-secondary font-medium italic">No trades available yet..</p>
              <p className="text-[10px] text-secondary/50">Check back later for market updates</p>
            </div>
          ) : (
            sortedTrades.map((trade) => {
              const pnl = trade.status === 'Open' 
                ? ((trade.currentPrice - trade.entry) / trade.entry * 100)
                : ((trade.exit - trade.entry) / trade.entry * 100);
              
              return (
                <div 
                  key={trade._id}
                  onClick={() => setSelectedSymbol({ symbol: trade.symbol, exchange: trade.exchange })}
                  className="group relative flex flex-col md:flex-row items-center justify-between p-6 rounded-2xl border border-white/10 hover:border-white/20 transition-all cursor-pointer overflow-hidden gap-6 md:gap-0"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-accent-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="flex items-center gap-6 z-10 w-full md:w-1/3">
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

                  <div className="flex flex-1 w-full justify-around items-center z-10 border-y md:border-y-0 border-white/5 py-4 md:py-0">
                    <div className="text-center">
                      <p className="text-[10px] text-secondary uppercase tracking-widest">{trade.status === 'Open' ? 'Bought at' : 'Sold at'}</p>
                      <p className="text-lg font-semibold">{trade.status === 'Open' ? trade.entry : trade.exit}</p>
                      {trade.status === 'Open' && (
                         <p className="text-[10px] text-green-400 flex items-center justify-center gap-1">
                          Live: <NumberFlow value={trade.currentPrice} format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
                         </p>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-secondary uppercase tracking-widest">P&L</p>
                      <p className={`font-bold flex items-center justify-center ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        <NumberFlow 
                          value={pnl} 
                          format={{ minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'always' }}
                          suffix="%"
                        />
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center md:justify-end gap-6 z-10 w-full md:w-auto">
                    <div 
                      className="flex items-center gap-2 group/btn cursor-pointer"
                    >
                      <div
                        className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                          trade.userInvested
                            ? 'bg-gradient-to-br from-rose-500 to-pink-500 border-transparent shadow-md'
                            : 'border-white/10 group-hover/btn:border-rose-400/50'
                        }`}
                        onClick={(e) => handleInteraction(e, trade._id, 'invest')}
                      >
                        <Check
                          size={14}
                          strokeWidth={3}
                          className={trade.userInvested ? 'text-white' : 'text-secondary'}
                        />
                      </div>
                      <div>
                        <p className="text-[10px] text-secondary">Invested</p>
                        <p className="text-sm font-bold">
                          <NumberFlow value={trade.investsCount || 0} />
                        </p>
                      </div>
                    </div>
                    <div 
                      className="flex items-center gap-2 group/btn cursor-pointer"
                    >
                      <div
                        className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${
                          trade.userLiked
                            ? 'bg-rose-500 border-2 border-transparent shadow-md'
                            : 'border-2 border-white/10 bg-transparent group-hover/btn:border-rose-400/50'
                        }`}
                        onClick={(e) => handleInteraction(e, trade._id, 'like')}
                      >
                        <Heart
                          size={14}
                          className={
                            trade.userLiked
                              ? 'text-white fill-white transition-transform duration-150 scale-105'
                              : 'text-secondary transition-transform duration-150'
                          }
                        />
                      </div>
                      <div>
                        <p className="text-[10px] text-secondary">Liked</p>
                        <p className="text-sm font-bold">
                          <NumberFlow value={trade.likesCount || 0} />
                        </p>
                      </div>
                    </div>
                    {isAdmin && trade.status === 'Open' && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTrade(trade);
                          setShowForm(true);
                        }}
                        className="px-4 py-2 bg-white/10 hover:bg-green-500/20 text-white rounded-lg text-xs"
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
            <div ref={commentsContainerRef} className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <div className="py-10">
                  <CandleLoader />
                </div>
              ) : (
                comments.map((c, i) => (
                  <div key={i} className="p-3 rounded-xl text-xs border-white/5 text-secondary">
                    <div className="flex justify-between items-start mb-1">
                      {isAdmin ? (
                        <p className="text-accent-cyan font-bold">
                          {c.userId?.username || 'User'}{' '}
                          <span className="text-[10px] text-secondary font-normal opacity-70">
                            ({c.userId?.email})
                          </span>
                        </p>
                      ) : (
                         <div /> // Empty div for flex alignment when not admin
                      )}
                      <p className="text-[9px] text-secondary whitespace-nowrap ml-2">
                         {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <p className="text-primary leading-relaxed">{c.comment}</p>
                  </div>
                ))
              )}
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
          symbol={selectedSymbol.symbol} 
          exchange={selectedSymbol.exchange}
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
