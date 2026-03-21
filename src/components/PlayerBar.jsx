import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayer } from '../context/PlayerContext';
import { getAudioUrl } from '../api/client';

export default function PlayerBar() {
  const { currentTrack, playing, progress, duration, volume, togglePlay, seek, setPlayerVolume } = usePlayer();

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
            max={duration || 100}
            value={progress}
            onChange={(e) => seek(Number(e.target.value))}
            className="player-slider"
          />
          <span className="player-time">{formatTime(duration)}</span>
        </div>
        <div className="player-volume">
          <span className="volume-label">🔊</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((volume || 0) * 100)}
            onChange={(e) => setPlayerVolume(Number(e.target.value) / 100)}
            className="player-slider volume-slider"
          />
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
          .player-volume {
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 150px;
          }
          .volume-label { color: var(--text-dim); font-size: 0.9rem; }
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
          .volume-slider { max-width: 120px; }
          @media (max-width: 900px) {
            .player-bar { flex-wrap: wrap; gap: 12px; }
            .player-controls { min-width: 100%; max-width: 100%; }
            .player-volume { margin-left: auto; }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
