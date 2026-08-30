import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, UserPlus, LogIn, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('admin@refundshield.io');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (isSignUp) {
      try {
        const res = await api.post('/auth/register', {
          username,
          email,
          password,
          role: 'Lead Investigator'
        });
        const { token, user: userData } = res.data;
        localStorage.setItem('refundshield_token', token);
        localStorage.setItem('refundshield_user', JSON.stringify(userData));
        window.location.reload();
      } catch (err) {
        setErrorMessage(err.response?.data?.error || 'Registration failed');
      }
    } else {
      const res = await login(email, password);
      if (res.success) {
        navigate('/dashboard');
      } else {
        setErrorMessage('Invalid email or password');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100">RefundShield</h1>
          <p className="text-xs text-slate-400">
            {isSignUp ? 'Create Investigator Account' : 'Coordinated Refund Abuse Investigation Portal'}
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl text-center font-mono">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="investigator_username"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="investigator@refundshield.io"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-10 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2"
          >
            <span>{isSignUp ? 'Sign Up' : 'Sign In'}</span>
            {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-400">
          {isSignUp ? (
            <span>
              Already have an account?{' '}
              <button
                onClick={() => {
                  setIsSignUp(false);
                  setEmail('admin@refundshield.io');
                  setPassword('admin123');
                  setShowPassword(false);
                  setErrorMessage('');
                }}
                className="text-blue-400 hover:underline font-bold"
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{' '}
              <button
                onClick={() => {
                  setIsSignUp(true);
                  setUsername('');
                  setEmail('');
                  setPassword('');
                  setShowPassword(false);
                  setErrorMessage('');
                }}
                className="text-blue-400 hover:underline font-bold"
              >
                Sign Up
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
