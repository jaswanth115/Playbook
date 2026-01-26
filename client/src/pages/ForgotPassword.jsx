import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('Sending Email...');
    try {
      await api.post('/auth/forgot-password', { email });
      setStep(2);
      setMessage('OTP sent to your email');
    } catch (err) {
      setMessage('');
      setError(err.response?.data?.message || 'Failed to send OTP');
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return setError('Password must be at least 8 characters long and include: 1 uppercase, 1 lowercase, 1 number, and 1 special character.');
    }
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword });
      setMessage('Password reset successful! Redirecting...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP or failed reset');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark px-4 py-8">
      <div className="max-w-md w-full space-y-8 p-6 md:p-10 rounded-2xl text-center border border-white/5 bg-white/[0.02]">
        <h2 className="text-3xl font-extrabold text-primary">Reset Password</h2>
        {message && <p className="text-green-400 text-sm">{message}</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        
        {step === 1 ? (
          <form className="mt-8 space-y-4" onSubmit={handleSendOTP}>
            <input
              type="email"
              placeholder="Enter your School Email"
              className="w-full px-4 py-3 bg-white/5 rounded-xl text-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="w-full py-3 rounded-xl">Send OTP</button>
          </form>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={handleReset}>
            <input
              type="text"
              placeholder="Enter OTP"
              className="w-full px-4 py-3 bg-white/5 rounded-xl text-white"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="New Password"
              className="w-full px-4 py-3 bg-white/5 rounded-xl text-white"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <button type="submit" className="w-full py-3 rounded-xl">Reset Password</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
