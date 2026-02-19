import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

const Signup = () => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: Signup form, 2: OTP verification
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      return setError('Password must be at least 8 characters long and include: 1 uppercase, 1 lowercase, 1 number, and 1 special character.');
    }
    if (!formData.email.endsWith('@mavs.uta.edu')) {
      return setError('Enter your school email');
    }

    try {
      setMessage('');
      setLoading(true);
      await api.post('/auth/signup', formData);
      setStep(2);
      setOtp('');
      setError('');
      setMessage('Account created! Please enter the OTP.');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await api.post('/auth/verify-signup', { email: formData.email, otp });
      setMessage('Account verified! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark px-4 py-8">
      <div className="max-w-md w-full space-y-8 p-6 md:p-10 rounded-2xl border border-white/5 bg-white/[0.02]">
        <h2 className="text-center text-3xl font-extrabold text-primary">Playbook</h2>
        <p className="text-center text-secondary text-sm">
          {step === 1 ? 'Start your trading journey' : 'Verify your email'}
        </p>

        {/* Stable Message Container */}
        <div className="h-10 flex items-center justify-center">
          {error && <p className="text-red-500 text-sm text-center bg-red-500/10 py-2 rounded-lg w-full">{error}</p>}
          {message && <p className="text-accent-cyan text-sm text-center bg-accent-cyan/10 py-2 rounded-lg w-full">{message}</p>}
        </div>

        {step === 1 ? (
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Name"
              className="w-full px-4 py-3 bg-white/5 rounded-xl transition-all text-white border border-white/10"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              required
            />
            <input
              type="email"
              placeholder="Email"
              className="w-full px-4 py-3 bg-white/5 rounded-xl transition-all text-white border border-white/10"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
            <input
              type="password"
              placeholder="Create Password"
              className="w-full px-4 py-3 bg-white/5 rounded-xl transition-all text-white border border-white/10"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
            <input
              type="password"
              placeholder="Confirm Password"
              className="w-full px-4 py-3 bg-white/5 rounded-xl transition-all text-white border border-white/10"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              required
            />
            <button
              type="submit"
              className="w-full py-3 px-4 mt-4 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Sign Up'}
            </button>
          </form>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={handleVerifyOTP}>
            <input
              type="text"
              placeholder="Enter OTP"
              className="w-full px-4 py-3 bg-white/5 rounded-xl transition-all text-white border border-white/10 text-center text-2xl tracking-[10px] font-bold"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              required
            />
            <button
              type="submit"
              className="w-full py-3 px-4 mt-4 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify & Complete'}
            </button>
            <button 
              type="button"
              onClick={() => {
                setStep(1);
                setError('');
                setMessage('');
              }}
              className="w-full text-xs text-secondary hover:text-white"
            >
              ← Back to Signup
            </button>
          </form>
        )}

        {step === 1 && (
          <p className="text-center text-sm text-secondary">
            Already have an account? <Link to="/login" className="hover:underline">Login</Link>
          </p>
        )}
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
