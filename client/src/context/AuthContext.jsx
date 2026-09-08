import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('dizco_token');
      const savedUser = localStorage.getItem('dizco_user');
      
      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          // Refresh user data from server in background
          const res = await authApi.getMe();
          setUser(res.data);
          localStorage.setItem('dizco_user', JSON.stringify(res.data));
        } catch (err) {
          console.error('Session expired or invalid:', err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const loginCustomer = async (email, password) => {
    try {
      const res = await authApi.login({ email, password });
      const { access_token, user: userData } = res.data;
      localStorage.setItem('dizco_token', access_token);
      localStorage.setItem('dizco_user', JSON.stringify(userData));
      setUser(userData);
      addToast(`Welcome back, ${userData.full_name}`, 'success');
      return userData;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Login failed. Please check credentials.';
      addToast(msg, 'error');
      throw new Error(msg);
    }
  };

  const loginAdmin = async (email, password) => {
    try {
      const res = await authApi.adminLogin({ email, password });
      const { access_token, user: userData } = res.data;
      localStorage.setItem('dizco_token', access_token);
      localStorage.setItem('dizco_user', JSON.stringify(userData));
      setUser(userData);
      addToast(`Admin Session Authenticated`, 'success');
      return userData;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Admin authentication failed.';
      addToast(msg, 'error');
      throw new Error(msg);
    }
  };

  const registerCustomer = async (data) => {
    try {
      const res = await authApi.register(data);
      const { access_token, user: userData } = res.data;
      localStorage.setItem('dizco_token', access_token);
      localStorage.setItem('dizco_user', JSON.stringify(userData));
      setUser(userData);
      addToast(`Welcome to DIZCO, ${userData.full_name}`, 'success');
      return userData;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed.';
      addToast(msg, 'error');
      throw new Error(msg);
    }
  };

  const logout = () => {
    localStorage.removeItem('dizco_token');
    localStorage.removeItem('dizco_user');
    setUser(null);
    addToast('Logged out successfully', 'info');
  };

  const refreshUser = async () => {
    try {
      const res = await authApi.getMe();
      setUser(res.data);
      localStorage.setItem('dizco_user', JSON.stringify(res.data));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        loginCustomer,
        loginAdmin,
        registerCustomer,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
