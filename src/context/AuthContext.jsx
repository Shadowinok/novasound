import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth as authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('novasound_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!!localStorage.getItem('novasound_token'));

  useEffect(() => {
    const token = localStorage.getItem('novasound_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authApi.me()
      .then((res) => {
        setUser(res.data.user);
        localStorage.setItem('novasound_user', JSON.stringify(res.data.user));
      })
      .catch(() => {
        localStorage.removeItem('novasound_token');
        localStorage.removeItem('novasound_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('auth_logout', onLogout);
    return () => window.removeEventListener('auth_logout', onLogout);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('novasound_token', token);
    localStorage.setItem('novasound_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('novasound_token');
    localStorage.removeItem('novasound_user');
    setUser(null);
    window.dispatchEvent(new Event('auth_logout'));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
