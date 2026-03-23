import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { auth } from '../api/client';

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    auth.login({ email, password })
      .then((r) => {
        login(r.data.token, r.data.user);
        navigate('/');
      })
      .catch((err) => {
        const status = err.response?.status;
        const d = err.response?.data;
        if (status === 403 && d?.needsVerification && d?.email) {
          navigate('/register/check-email', { state: { email: d.email } });
          return;
        }
        const fromValidation = Array.isArray(d?.errors) && d.errors[0]?.msg;
        const msg =
          (typeof d?.message === 'string' && d.message.trim()) ||
          fromValidation ||
          (status === 401 ? 'Неверный логин или пароль. Проверьте email и пароль.' : '') ||
          'Ошибка входа';
        setError(msg);
      })
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
          <div className="auth-field-password">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="auth-input auth-input-password"
              autoComplete="current-password"
            />
            <button
              type="button"
              className="auth-toggle-password"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            >
              <EyeIcon open={!showPassword} />
            </button>
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" disabled={loading} className="auth-submit">
            {loading ? (
              <span className="auth-submit-inner">
                <span className="auth-spinner" aria-hidden />
                Входим…
              </span>
            ) : (
              'Войти'
            )}
          </button>
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
        .auth-field-password {
          position: relative;
          margin-bottom: 16px;
        }
        .auth-input-password {
          margin-bottom: 0;
          padding-right: 48px;
        }
        .auth-toggle-password {
          position: absolute;
          right: 6px;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0,0,0,0.35);
          border: 1px solid rgba(5, 217, 232, 0.35);
          border-radius: 8px;
          cursor: pointer;
          padding: 6px;
          color: var(--neon-cyan);
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 0;
        }
        .auth-toggle-password:hover { border-color: var(--neon-cyan); box-shadow: 0 0 12px rgba(5, 217, 232, 0.25); }
        .auth-error { color: #ff6b6b; margin-bottom: 12px; font-size: 0.9rem; }
        .auth-submit-inner {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .auth-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 42, 109, 0.25);
          border-top-color: var(--neon-pink);
          border-radius: 50%;
          animation: auth-spin 0.65s linear infinite;
        }
        @keyframes auth-spin {
          to { transform: rotate(360deg); }
        }
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
        .auth-submit:disabled {
          opacity: 0.85;
          cursor: wait;
        }
        .auth-submit:hover:not(:disabled) { background: rgba(255, 42, 109, 0.4); }
        .auth-footer { margin-top: 20px; text-align: center; color: var(--text-dim); }
      `}</style>
    </motion.div>
  );
}
