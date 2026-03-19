import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import client from '../api/client';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState('loading'); // loading | ok | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Нет token в ссылке');
      return;
    }
    client.get('/auth/verify-email', { params: { token } })
      .then((r) => {
        setStatus('ok');
        setMessage(r.data?.message || 'Email подтверждён');
      })
      .catch((e) => {
        setStatus('error');
        setMessage(e.response?.data?.message || 'Не удалось подтвердить email');
      });
  }, [token]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page">
      <h2 className="page-title">Подтверждение email</h2>
      <div className={status === 'ok' ? 'notice ok' : status === 'error' ? 'notice err' : 'notice'}>
        {status === 'loading' ? 'Проверяем ссылку...' : message}
      </div>
      <div style={{ marginTop: 16 }}>
        <Link to="/login" className="neon-btn">Перейти ко входу</Link>
      </div>
      <style>{`
        .page-title { color: var(--neon-cyan); margin-bottom: 16px; }
        .notice {
          padding: 16px;
          border-radius: 12px;
          border: 1px solid rgba(5, 217, 232, 0.25);
          background: rgba(0,0,0,0.25);
          color: var(--text);
          max-width: 520px;
        }
        .notice.ok { border-color: rgba(0, 255, 100, 0.35); }
        .notice.err { border-color: rgba(255, 50, 50, 0.35); }
        .neon-btn {
          display: inline-block;
          padding: 10px 24px;
          border: 2px solid var(--neon-cyan);
          color: var(--neon-cyan);
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .neon-btn:hover { background: rgba(5, 217, 232, 0.2); box-shadow: var(--glow-cyan); }
      `}</style>
    </motion.div>
  );
}

