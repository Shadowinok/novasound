import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayer } from '../context/PlayerContext';

export default function PlayerBar() {
  const { currentTrack, playing, progress, duration, volume, togglePlay, seek, setPlayerVolume } = usePlayer();
  const [volumeOpen, setVolumeOpen] = useState(false);
  const volumeWrapRef = useRef(null);

  useEffect(() => {
    if (!volumeOpen) return;
    const onDoc = (e) => {
      if (volumeWrapRef.current && !volumeWrapRef.current.contains(e.target)) {
        setVolumeOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setVolumeOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [volumeOpen]);

  const volPct = Math.round((volume || 0) * 100);
  const volumeIcon = volPct === 0 ? '🔇' : volPct < 40 ? '🔉' : '🔊';

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!currentTrack) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="player-bar"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
      >
        <div className="player-info">
          <div
            className="player-cover"
            style={{ backgroundImage: currentTrack.coverImage ? `url(${currentTrack.coverImage})` : 'linear-gradient(135deg, var(--neon-purple), var(--neon-pink))' }}
          />
          <div>
            <div className="player-title">{currentTrack.title}</div>
            <div className="player-author">{currentTrack.author?.username || '—'}</div>
          </div>
        </div>
        <div className="player-controls">
          <button type="button" className="player-btn play-pause" onClick={togglePlay}>
            {playing ? '⏸' : '▶'}
          </button>
          <span className="player-time">{formatTime(progress)}</span>
          <input
            type="range"
            min={0}
            max={duration > 0 ? duration : 1}
            step="any"
            value={duration > 0 ? Math.min(progress, duration) : 0}
            disabled={!duration || duration <= 0}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (duration > 0 && Number.isFinite(v)) seek(v);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="player-slider"
            aria-label="Прогресс воспроизведения"
          />
          <span className="player-time">{formatTime(duration)}</span>
        </div>
        <div className="player-volume-wrap" ref={volumeWrapRef}>
          <button
            type="button"
            className="volume-toggle"
            aria-label="Громкость"
            aria-expanded={volumeOpen}
            aria-controls="player-volume-popover"
            onClick={() => setVolumeOpen((v) => !v)}
          >
            <span className="volume-toggle-icon" aria-hidden>
              {volumeIcon}
            </span>
          </button>
          <AnimatePresence>
            {volumeOpen && (
              <motion.div
                id="player-volume-popover"
                className="volume-popover"
                role="dialog"
                aria-label="Уровень громкости"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15 }}
              >
                <span className="volume-popover-value">{volPct}%</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volPct}
                  onChange={(e) => setPlayerVolume(Number(e.target.value) / 100)}
                  className="player-slider volume-slider"
                  onClick={(e) => e.stopPropagation()}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <style>{`
          .player-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 90;
            background: rgba(10, 10, 20, 0.95);
            border-top: 1px solid rgba(5, 217, 232, 0.3);
            padding: 12px 24px;
            display: flex;
            align-items: center;
            gap: 24px;
            box-shadow: 0 -4px 30px rgba(255, 42, 109, 0.15);
          }
          .player-info {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 200px;
          }
          .player-cover {
            width: 48px;
            height: 48px;
            border-radius: 8px;
            background-size: cover;
            background-position: center;
            border: 1px solid var(--neon-cyan);
            box-shadow: 0 0 15px rgba(5, 217, 232, 0.3);
          }
          .player-title {
            font-family: var(--font-display);
            font-size: 0.95rem;
            color: var(--neon-cyan);
          }
          .player-author {
            font-size: 0.8rem;
            color: var(--text-dim);
          }
          .player-controls {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 12px;
            max-width: 500px;
          }
          .player-volume-wrap {
            position: relative;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: flex-end;
          }
          .volume-toggle {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: 2px solid rgba(5, 217, 232, 0.45);
            background: rgba(5, 217, 232, 0.1);
            color: var(--neon-cyan);
            font-size: 1.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            line-height: 1;
            box-shadow: 0 0 12px rgba(5, 217, 232, 0.25);
          }
          .volume-toggle:hover,
          .volume-toggle[aria-expanded="true"] {
            background: rgba(5, 217, 232, 0.2);
            border-color: var(--neon-cyan);
          }
          .volume-toggle-icon { pointer-events: none; }
          .volume-popover {
            position: absolute;
            bottom: calc(100% + 10px);
            right: 0;
            left: auto;
            z-index: 95;
            min-width: 160px;
            padding: 12px 14px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            align-items: stretch;
            background: rgba(12, 12, 22, 0.98);
            border: 1px solid rgba(5, 217, 232, 0.35);
            border-radius: 10px;
            box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.45), 0 0 20px rgba(5, 217, 232, 0.12);
          }
          .volume-popover-value {
            font-size: 0.75rem;
            color: var(--text-dim);
            text-align: center;
            letter-spacing: 0.06em;
          }
          .player-btn {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: 2px solid var(--neon-pink);
            background: rgba(255, 42, 109, 0.15);
            color: var(--neon-pink);
            font-size: 1.2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 20px rgba(255, 42, 109, 0.4);
          }
          .player-btn:hover {
            background: rgba(255, 42, 109, 0.3);
          }
          .player-time {
            font-size: 0.85rem;
            color: var(--text-dim);
            min-width: 36px;
          }
          .player-slider {
            flex: 1;
            height: 6px;
            -webkit-appearance: none;
            background: rgba(255,255,255,0.1);
            border-radius: 3px;
          }
          .player-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: var(--neon-cyan);
            box-shadow: 0 0 10px var(--neon-cyan);
            cursor: pointer;
          }
          .volume-slider { width: 100%; max-width: none; min-width: 120px; }
          @media (max-width: 900px) {
            .player-bar {
              flex-wrap: wrap;
              gap: 10px;
              padding: 10px 12px;
              align-items: flex-start;
            }
            .player-info { min-width: 0; flex: 1 1 140px; }
            .player-title { font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 42vw; }
            .player-author { font-size: 0.72rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 42vw; }
            .player-cover { width: 40px; height: 40px; flex-shrink: 0; }
            .player-controls {
              min-width: 100%;
              max-width: 100%;
              order: 3;
              gap: 8px;
            }
            .player-volume-wrap { margin-left: auto; order: 2; align-self: center; }
            .player-btn.play-pause { width: 40px; height: 40px; font-size: 1.05rem; }
            .player-time { font-size: 0.78rem; min-width: 32px; }
          }
          @media (max-width: 480px) {
            .player-bar { padding: 8px 10px; gap: 8px; }
            .player-title, .player-author { max-width: 56vw; }
            .volume-popover {
              right: 0;
              left: auto;
              min-width: 140px;
            }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
