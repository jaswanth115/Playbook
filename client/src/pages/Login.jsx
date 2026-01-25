import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark px-4">
      <div className="max-w-md w-full space-y-8 p-10 rounded-2xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-primary">Playbook</h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Enter your Email"
              className="w-full px-4 py-3 bg-white/5 border-white/10 rounded-xl transition-all text-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Enter Password"
              className="w-full px-4 py-3 bg-white/5 border-white/10 rounded-xl transition-all text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <Link to="/forgot-password" size="sm" className="text-xs hover:underline">Forgot password?</Link>
          </div>
          <button
            type="submit"
            className="w-full py-3 px-4 text-white rounded-xl font-semibold transition-all"
          >
            Login
          </button>
        </form>
        <p className="text-center text-sm text-secondary">
          Don't have an account? <Link to="/signup" className="hover:underline">Signup</Link>
        </p>
        <div className="mt-8 text-center text-[10px] text-gray-500 max-w-sm mx-auto leading-relaxed">
          Disclaimer: This platform does not force, encourage, or require any user to trade stocks.
          All trade ideas are for informational purposes only and should not be considered financial advice.
          Users are solely responsible for their own investment decisions.
        </div>
      </div>
    </div>
  );
};

export default Login;
