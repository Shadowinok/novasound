import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { auth } from '../api/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    auth.login({ email, password })
      .then((r) => {
        login(r.data.token, r.data.user);
        navigate('/');
      })
      .catch((err) => setError(err.response?.data?.message || 'Ошибка входа'))
      .finally(() => setLoading(false));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">Вход</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="auth-input"
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="auth-input"
          />
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" disabled={loading} className="auth-submit">Войти</button>
        </form>
        <p className="auth-footer">Нет аккаунта? <Link to="/register">Регистрация</Link></p>
      </div>
      <style>{`
        .auth-page { display: flex; justify-content: center; align-items: center; min-height: 60vh; padding: 24px; }
        .auth-card {
          width: 100%;
          max-width: 380px;
          padding: 32px;
          background: var(--bg-card);
          border: 1px solid rgba(5, 217, 232, 0.3);
          border-radius: 16px;
          box-shadow: 0 0 40px rgba(5, 217, 232, 0.15);
        }
        .auth-title { color: var(--neon-cyan); margin-bottom: 24px; text-align: center; }
        .auth-input {
          width: 100%;
          padding: 12px 16px;
          margin-bottom: 16px;
          border: 1px solid rgba(5, 217, 232, 0.4);
          border-radius: 8px;
          background: rgba(0,0,0,0.3);
          color: var(--text);
        }
        .auth-error { color: #ff6b6b; margin-bottom: 12px; font-size: 0.9rem; }
        .auth-submit {
          width: 100%;
          padding: 14px;
          border: 2px solid var(--neon-pink);
          background: rgba(255, 42, 109, 0.2);
          color: var(--neon-pink);
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
        }
        .auth-submit:hover:not(:disabled) { background: rgba(255, 42, 109, 0.4); }
        .auth-footer { margin-top: 20px; text-align: center; color: var(--text-dim); }
      `}</style>
    </motion.div>
  );
}
