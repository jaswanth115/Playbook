import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

const Signup = () => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      return setError('Password must be at least 8 characters long and include: 1 uppercase, 1 lowercase, 1 number, and 1 special character.');
    }
    if (!formData.email.endsWith('@mavs.uta.edu')) {
      return setError('Only @mavs.uta.edu emails allowed');
    }

    try {
      await api.post('/auth/signup', formData);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark px-4">
      <div className="max-w-md w-full space-y-8 p-10 rounded-2xl">
        <h2 className="text-center text-3xl font-extrabold text-primary">Playbook</h2>
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <input
            type="text"
            placeholder="Name"
            className="w-full px-4 py-3 bg-white/5 rounded-xl transition-all text-white"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            required
          />
          <input
            type="email"
            placeholder="Enter your Email"
            className="w-full px-4 py-3 bg-white/5 rounded-xl transition-all text-white"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
          <input
            type="password"
            placeholder="Enter Password"
            className="w-full px-4 py-3 bg-white/5 rounded-xl transition-all text-white"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
          />
          <input
            type="password"
            placeholder="Confirm Password"
            className="w-full px-4 py-3 bg-white/5 rounded-xl transition-all text-white"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
            required
          />
          <button
            type="submit"
            className="w-full py-3 px-4 mt-4 text-white rounded-xl font-semibold transition-all"
          >
            Signup
          </button>
        </form>
        <p className="text-center text-sm text-secondary">
          Already have an account? <Link to="/login" className="hover:underline">Login</Link>
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

export default Signup;
