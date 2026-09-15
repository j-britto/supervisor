import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('psms_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await api.login(username, password);
      if (res.success) {
        setUser(res.admin);
        localStorage.setItem('psms_user', JSON.stringify(res.admin));
        setLoading(false);
        return { success: true };
      } else {
        setLoading(false);
        return { success: false, error: res.error || 'Login failed' };
      }
    } catch (err) {
      setLoading(false);
      return { success: false, error: 'Network error during login' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('psms_user');
  };

  const loginWithAdminData = (adminData) => {
    setUser(adminData);
    localStorage.setItem('psms_user', JSON.stringify(adminData));
  };

  const refreshUser = async () => {
    try {
      const res = await api.getProfileSettings();
      if (res.admin) {
        setUser(res.admin);
        localStorage.setItem('psms_user', JSON.stringify(res.admin));
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loginWithAdminData, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
