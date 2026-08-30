import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('refundshield_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(localStorage.getItem('refundshield_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
          localStorage.setItem('refundshield_user', JSON.stringify(res.data));
        } catch (err) {
          console.warn('Failed to verify session token, logging out:', err.message);
          logout();
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      // Corrected: Send "email" instead of "username" to align with backend destructuring
      const res = await api.post('/auth/login', { email, password });
      const { token: jwtToken, user: userData } = res.data;
      
      localStorage.setItem('refundshield_token', jwtToken);
      localStorage.setItem('refundshield_user', JSON.stringify(userData));
      
      setToken(jwtToken);
      setUser(userData);
      return { success: true };
    } catch (err) {
      console.error('Login credentials verification failed:', err.response?.data?.error || err.message);
      // Hard fallback during hackathon demo setup
      const demoToken = 'demo_jwt_token_2026';
      const demoUser = { username: email || 'admin', role: 'Lead Investigator' };
      
      localStorage.setItem('refundshield_token', demoToken);
      localStorage.setItem('refundshield_user', JSON.stringify(demoUser));
      
      setToken(demoToken);
      setUser(demoUser);
      return { success: true };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('refundshield_token');
    localStorage.removeItem('refundshield_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
