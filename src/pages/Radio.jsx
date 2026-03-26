import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { tracks as tracksApi } from '../api/client';
import { usePlayer } from '../context/PlayerContext';

/**
 * Этап 0 из docs/развитие радио.md — честный статус без фейкового «эфира»
 * Озвучка ведущего — в `components/RadioHost.jsx` (глобально в Layout).
 */
export default function Radio() {
  const { loadTrack, currentTrack, queue, queueIndex, isRadioMode } = usePlayer();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [radio, setRadio] = useState({
    now: null,
    next: [],
    history: [],
    queue: [],
    nowOffsetSec: 0,
    djEpisode: null
  });

  const activeNow = isRadioMode && currentTrack ? currentTrack : radio.now;
  const activeNext = isRadioMode && Array.isArray(queue) && queue.length
    ? queue.slice(queueIndex + 1, queueIndex + 6)
    : radio.next;

  const loadRadio = useCallback(async (opts = {}) => {
    const resyncPlayback = Boolean(opts.resyncPlayback);
    setLoading(true);
    setError('');
    try {
      const { data } = await tracksApi.radioNow({ limit: 30 });
      const nextRadio = {
        now: data?.now || null,
        next: Array.isArray(data?.next) ? data.next : [],
        history: Array.isArray(data?.history) ? data.history : [],
        queue: Array.isArray(data?.queue) ? data.queue : [],
        nowOffsetSec: Number(data?.nowOffsetSec) || 0,
        djEpisode: data?.djEpisode || null
      };
      setRadio(nextRadio);

      if (resyncPlayback && nextRadio.now && nextRadio.queue.length) {
        loadTrack(nextRadio.now, {
          queue: nextRadio.queue,
          startIndex: 0,
          isRadio: true,
          startAtSec: nextRadio.nowOffsetSec
        });
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'Не удалось загрузить эфир');
    } finally {
      setLoading(false);
    }
  }, [loadTrack]);

  useEffect(() => {
    loadRadio();
  }, [loadRadio]);

  useEffect(() => {
    const poll = setInterval(() => {
      loadRadio();
    }, 30000);
    return () => clearInterval(poll);
  }, [loadRadio]);

  const startRadio = () => {
    if (!radio.now || !radio.queue.length) return;
    loadTrack(radio.now, {
      queue: radio.queue,
      startIndex: 0,
      isRadio: true,
      startAtSec: radio.nowOffsetSec
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page radio-page">
      <header className="radio-header">
        <h1 className="page-title radio-main-title">
          <span className="brand-nova">Nova</span><span className="brand-sound">Sound</span> Radio
        </h1>
        <p className="radio-tagline">Интернет-станция про ИИ и музыку — в разработке</p>
      </header>

      <div className="radio-body">
        <section className="radio-block radio-now">
          <h2>Сейчас</h2>
          {loading && (
            <div className="radio-loading" aria-live="polite" aria-label="Синхронизация эфира">
              <span className="radio-spinner" aria-hidden />
            </div>
          )}
          {error ? (
            <p>{error}</p>
          ) : !activeNow ? (
            <p>Эфир оффлайн</p>
          ) : (
            <>
              <p>
                В эфире: <b>{activeNow.title}</b> — {activeNow.author?.username || 'Неизвестный автор'}
              </p>
              {!!activeNext.length && (
                <ul>
                  {activeNext.map((t) => (
                    <li key={t._id}>{t.title} — {t.author?.username || 'Автор'}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        <div className="radio-cta">
          <button type="button" className="radio-btn" onClick={startRadio} disabled={!radio.now || loading}>
            Запустить эфир
          </button>
          <button
            type="button"
            className="radio-btn radio-btn-ghost"
            onClick={() => loadRadio({ resyncPlayback: true })}
            disabled={loading}
          >
            Обновить
          </button>
          <Link to="/playlists" className="radio-btn radio-btn-ghost">Плейлисты</Link>
        </div>

        {!!radio.history?.length && (
          <section className="radio-block">
            <h2>История эфира</h2>
            <ul>
              {radio.history.map((t) => (
                <li key={`h-${t._id}`}>{t.title} — {t.author?.username || 'Автор'}</li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <style>{`
        .radio-page { padding-bottom: 48px; }
        .radio-header {
          text-align: center;
          margin-bottom: 8px;
        }
        .radio-main-title {
          width: 100%;
          text-align: center;
        }
        .brand-nova { color: var(--neon-pink); }
        .brand-sound { color: var(--neon-cyan); }
        .radio-tagline {
          text-align: center;
          color: var(--neon-cyan);
          font-size: 1rem;
          margin: 8px 0 24px;
          letter-spacing: 0.04em;
        }
        .radio-body {
          max-width: 720px;
          margin: 0 auto;
          padding: 0 16px;
        }
        .radio-block {
          margin-bottom: 28px;
          line-height: 1.6;
          color: var(--text);
        }
        .radio-loading {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: var(--text-dim);
          margin-bottom: 10px;
        }
        .radio-spinner {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 2px solid rgba(5, 217, 232, 0.25);
          border-top-color: var(--neon-cyan);
          animation: radioSpin .8s linear infinite;
        }
        @keyframes radioSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .radio-block h2 {
          font-size: 1.1rem;
          color: var(--neon-pink);
          margin-bottom: 10px;
        }
        .radio-block ul { margin: 0 0 0 18px; }
        .radio-block li { margin-bottom: 6px; }
        .radio-block a {
          color: var(--neon-cyan);
          text-decoration: none;
          border-bottom: 1px solid rgba(5, 217, 232, 0.35);
        }
        .radio-block a:hover { text-shadow: var(--glow-cyan); }
        .radio-cta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 16px;
          margin-top: 36px;
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .radio-btn {
          display: inline-block;
          padding: 10px 22px;
          border: 2px solid var(--neon-pink);
          color: var(--neon-pink);
          border-radius: 8px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
          background: transparent;
          font-family: var(--font-body);
        }
        .radio-btn:hover { background: rgba(255, 42, 109, 0.15); box-shadow: 0 0 20px rgba(255, 42, 109, 0.25); }
        .radio-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }
        .radio-btn-ghost {
          border-color: rgba(5, 217, 232, 0.55);
          color: var(--neon-cyan);
        }
        .radio-btn-ghost:hover { background: rgba(5, 217, 232, 0.06); box-shadow: var(--glow-cyan); }
      `}</style>
    </motion.div>
  );
}
