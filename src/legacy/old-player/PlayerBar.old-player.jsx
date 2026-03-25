import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { usePlayer } from '../../context/PlayerContext';

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
      </motion.div>
    </AnimatePresence>
  );
}
