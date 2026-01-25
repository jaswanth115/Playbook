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
          Discover trending trades.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl">
        <div className="p-8 rounded-3xl space-y-4 text-center">
          <button 
            onClick={() => navigate('/signup')}
          >
            Sign up
          </button>
        </div>
        <div className="p-8 rounded-3xl space-y-4 text-center">
          <button 
            onClick={() => navigate('/login')}
          >
            Sign in
          </button>
        </div>
      </div>

      <div className="mt-auto text-center text-xs text-gray-400 max-w-3xl">
        Disclaimer: This platform does not force, encourage, or require any user to trade stocks.
        All trade ideas are for informational purposes only and should not be considered financial advice.
        Users are solely responsible for their own investment decisions.
      </div>
    </div>
  );
};

export default Landing;
