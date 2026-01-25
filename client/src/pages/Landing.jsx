import React from 'react';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark text-white flex flex-col items-center justify-center p-8 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-r from-accent-cyan to-accent-purple bg-clip-text text-transparent">
          Playbook
        </h1>
        <p className="text-secondary max-w-md mx-auto text-lg">
          The ultimate trade posting platform for UTA students. Track, analyze, and learn from top trades.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <div className="p-8 bg-card rounded-3xl border border-white/10 space-y-4 text-center">
          <h3 className="text-xl font-bold">New Here?</h3>
          <p className="text-sm text-secondary">Join the UTA trading community and level up your strategy.</p>
          <button 
            onClick={() => navigate('/signup')}
            className="w-full py-4 bg-white/10 hover:bg-white text-dark rounded-2xl font-black transition-all"
          >
            Create Account
          </button>
        </div>
        <div className="p-8 bg-card rounded-3xl border border-white/10 space-y-4 text-center">
          <h3 className="text-xl font-bold">Welcome Back</h3>
          <p className="text-sm text-secondary">Sign in to check latest trades and performance.</p>
          <button 
            onClick={() => navigate('/login')}
            className="w-full py-4 bg-accent-cyan/20 hover:bg-accent-cyan text-white rounded-2xl font-black border border-accent-cyan/30 transition-all"
          >
            Sign In
          </button>
        </div>
      </div>

      <div className="pt-12 flex gap-12 text-secondary text-sm">
        <div className="text-center"><p className="text-white font-bold text-2xl">130K</p><p>Students</p></div>
        <div className="text-center"><p className="text-white font-bold text-2xl">$2.4M</p><p>Volume</p></div>
        <div className="text-center"><p className="text-white font-bold text-2xl">15k+</p><p>Trades</p></div>
      </div>
    </div>
  );
};

export default Landing;
