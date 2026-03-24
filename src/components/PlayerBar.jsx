import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { usePlayer } from '../context/PlayerContext';

export default function PlayerBar() {
  const {
    currentTrack,
    playing,
    progress,
    buffered,
    duration,
    volume,
    queue,
    queueIndex,
    repeatMode,
    isRadioMode,
    togglePlay,
    playNext,
    playPrev,
    cycleRepeatMode,
    seek,
    setPlayerVolume,
    closePlayer
  } = usePlayer();
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekDraft, setSeekDraft] = useState(0);
  const volumeWrapRef = useRef(null);

  const commitSeek = (value) => {
    if (!(duration > 0)) return;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    seek(numeric);
    setSeekDraft(numeric);
  };

  useEffect(() => {
    if (!isSeeking) setSeekDraft(duration > 0 ? Math.min(progress, duration) : 0);
  }, [progress, duration, isSeeking]);

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
  const canPrev = queueIndex > 0 || repeatMode === 'all-repeat';
  const canNext = queueIndex < (queue.length - 1) || repeatMode === 'all-repeat';
  const repeatLabel = repeatMode === 'one'
    ? '1'
    : repeatMode === 'one-repeat'
      ? '↻1'
      : repeatMode === 'all'
        ? 'all'
        : '↻all';

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!currentTrack) return null;
  const maxDuration = duration > 0 ? duration : 1;
  const sliderValue = isSeeking ? seekDraft : (duration > 0 ? Math.min(progress, duration) : 0);
  const playedPct = duration > 0 ? Math.max(0, Math.min(100, (sliderValue / duration) * 100)) : 0;
  const bufferedPct = duration > 0 ? Math.max(0, Math.min(100, (buffered / duration) * 100)) : 0;
  const sliderTrackStyle = {
    background: `linear-gradient(to right,
      rgba(5, 217, 232, 0.95) 0%,
      rgba(5, 217, 232, 0.95) ${playedPct}%,
      rgba(180, 220, 230, 0.45) ${playedPct}%,
      rgba(180, 220, 230, 0.45) ${bufferedPct}%,
      rgba(255,255,255,0.12) ${bufferedPct}%,
      rgba(255,255,255,0.12) 100%)`
  };

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
          <button type="button" className="player-btn nav-btn" onClick={playPrev} disabled={!canPrev} aria-label="Предыдущий трек">
            ⏮
          </button>
          <button
            type="button"
            className="player-btn play-pause"
            onClick={togglePlay}
          >
            {playing ? '⏸' : '▶'}
          </button>
          <button type="button" className="player-btn nav-btn" onClick={playNext} disabled={!canNext} aria-label="Следующий трек">
            ⏭
          </button>
          <span className="player-time">{formatTime(progress)}</span>
          <div className="player-slider-wrap" style={sliderTrackStyle}>
            <Slider
              min={0}
              max={maxDuration}
              step={0.01}
              value={sliderValue}
              disabled={!duration || duration <= 0}
              onBeforeChange={() => setIsSeeking(true)}
              onChange={(v) => setSeekDraft(Number(v) || 0)}
              onAfterChange={(v) => {
                commitSeek(Number(v) || 0);
                setIsSeeking(false);
              }}
              className="player-slider"
              ariaLabelForHandle="Прогресс воспроизведения"
            />
          </div>
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
          <button
            type="button"
            className={`player-btn repeat-btn mode-${repeatMode}`}
            onClick={cycleRepeatMode}
            aria-label="Режим повтора"
            title="Режим повтора"
            disabled={isRadioMode}
          >
            {repeatLabel}
          </button>
          <button
            type="button"
            className="player-close"
            aria-label="Закрыть плеер"
            title="Закрыть плеер"
            onClick={() => {
              setVolumeOpen(false);
              closePlayer();
            }}
          >
            <span aria-hidden>✕</span>
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
            bottom: var(--footer-dock-height, 0px);
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
            gap: 8px;
          }
          .player-close {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 1px solid rgba(255, 255, 255, 0.2);
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-dim);
            font-size: 1.1rem;
            line-height: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            cursor: pointer;
            flex-shrink: 0;
          }
          .player-close:hover {
            color: var(--neon-pink);
            border-color: rgba(255, 42, 109, 0.5);
            background: rgba(255, 42, 109, 0.12);
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
          .player-btn:disabled {
            opacity: 0.45;
            cursor: not-allowed;
            box-shadow: none;
          }
          .player-btn:hover {
            background: rgba(255, 42, 109, 0.3);
          }
          .repeat-btn {
            min-width: 48px;
            width: 48px;
            height: 44px;
            border-radius: 999px;
            padding: 0 8px;
            font-size: 0.9rem;
            font-family: var(--font-display);
            letter-spacing: 0.02em;
            box-shadow: none;
          }
          .repeat-btn.mode-one, .repeat-btn.mode-all {
            border-color: rgba(5, 217, 232, 0.6);
            color: var(--neon-cyan);
            background: rgba(5, 217, 232, 0.12);
            box-shadow: 0 0 12px rgba(5, 217, 232, 0.18);
          }
          .repeat-btn.mode-one-repeat, .repeat-btn.mode-all-repeat {
            border-color: rgba(255, 200, 0, 0.7);
            color: #ffd65a;
            background: rgba(255, 200, 0, 0.16);
            box-shadow: 0 0 12px rgba(255, 200, 0, 0.18);
          }
          .player-time {
            font-size: 0.85rem;
            color: var(--text-dim);
            min-width: 36px;
          }
          .player-slider-wrap {
            flex: 1;
            height: 8px;
            border-radius: 999px;
            padding: 1px 0;
            display: flex;
            align-items: center;
          }
          .player-slider {
            width: 100%;
            margin: 0;
          }
          .player-slider .rc-slider-rail,
          .player-slider .rc-slider-track {
            height: 6px;
            border-radius: 999px;
            background: transparent;
          }
          .player-slider .rc-slider-handle {
            width: 14px;
            height: 14px;
            margin-top: -4px;
            border: 0;
            border-radius: 50%;
            background: var(--neon-cyan);
            box-shadow: 0 0 10px var(--neon-cyan);
            cursor: pointer;
          }
          .player-slider .rc-slider-handle:focus-visible {
            outline: 2px solid rgba(5, 217, 232, 0.5);
            outline-offset: 2px;
          }
          .player-slider .rc-slider-handle-dragging.rc-slider-handle-dragging.rc-slider-handle-dragging {
            box-shadow: 0 0 14px var(--neon-cyan);
            border-color: transparent;
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
