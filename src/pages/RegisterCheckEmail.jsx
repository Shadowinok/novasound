import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { auth } from '../api/client';

const DEFAULT_COOLDOWN_MIN = 5;

export default function RegisterCheckEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const emailFromQuery = searchParams.get('email') || '';
  const emailFromState = location.state?.email || '';
  const email = (emailFromState || emailFromQuery || '').trim();

  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!email) navigate('/register', { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const t = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const startCooldown = useCallback((sec) => {
    const s = Math.max(0, Number(sec) || DEFAULT_COOLDOWN_MIN * 60);
    setSecondsLeft(s);
  }, []);

  const handleResend = () => {
    if (!email || secondsLeft > 0 || loading) return;
    setError('');
    setOk('');
    setLoading(true);
    auth
      .resendVerification(email)
      .then(() => {
        setOk('Письмо отправлено повторно.');
        startCooldown(DEFAULT_COOLDOWN_MIN * 60);
      })
      .catch((err) => {
        const d = err.response?.data;
        if (err.response?.status === 429 && d?.retryAfterSec) {
          startCooldown(d.retryAfterSec);
          setError(d.message || 'Слишком часто. Подождите.');
        } else {
          setError(d?.message || err.message || 'Не удалось отправить');
        }
      })
      .finally(() => setLoading(false));
  };

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/register');
  };

  if (!email) return null;

  const mins = Math.ceil(secondsLeft / 60) || 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="auth-page check-email-page">
      <div className="auth-card check-email-card">
        <h2 className="auth-title">Проверьте почту</h2>
        <p className="check-email-lead">
          Мы отправили письмо с ссылкой для подтверждения на <b>{email}</b>.
        </p>
        <ul className="check-email-list">
          <li>Откройте почту и перейдите по ссылке из письма.</li>
          <li>Если письма нет во «Входящих», проверьте папку <b>Спам</b> / «Нежелательная почта».</li>
          <li>Ссылка в письме действует 24 часа.</li>
        </ul>
        {ok && <div className="auth-success">{ok}</div>}
        {error && <div className="auth-error">{error}</div>}
        <div className="check-email-actions">
          <button
            type="button"
            className="auth-submit secondary"
            disabled={loading || secondsLeft > 0}
            onClick={handleResend}
          >
            {loading
              ? 'Отправка...'
              : secondsLeft > 0
                ? `Повторная отправка через ${mins > 0 ? `${mins} мин` : `${secondsLeft} сек`}`
                : 'Отправить письмо ещё раз'}
          </button>
          <button type="button" className="auth-link-btn" onClick={goBack}>
            ← Назад
          </button>
        </div>
        <p className="auth-footer">
          Уже подтвердили? <Link to="/login">Вход</Link>
        </p>
      </div>
      <style>{`
        .check-email-page { min-height: 65vh; }
        .check-email-card { max-width: 440px; }
        .check-email-lead { color: var(--text); line-height: 1.5; margin-bottom: 16px; font-size: 0.95rem; }
        .check-email-list {
          margin: 0 0 20px 0;
          padding-left: 20px;
          color: var(--text-dim);
          line-height: 1.55;
          font-size: 0.9rem;
        }
        .check-email-actions { display: flex; flex-direction: column; gap: 12px; }
        .auth-submit.secondary {
          border-color: var(--neon-cyan);
          color: var(--neon-cyan);
          background: rgba(5, 217, 232, 0.12);
        }
        .auth-submit.secondary:disabled { opacity: 0.55; cursor: not-allowed; }
        .auth-link-btn {
          background: transparent;
          border: none;
          color: var(--text-dim);
          cursor: pointer;
          font-size: 0.95rem;
          text-align: center;
          padding: 8px;
        }
        .auth-link-btn:hover { color: var(--neon-cyan); }
      `}</style>
    </motion.div>
  );
}
