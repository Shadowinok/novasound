import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { Howl, Howler } from 'howler';
import { tracks as tracksApi, getAudioUrl } from '../api/client';

/**
 * По умолчанию Howler вешает на document первый click/touch и для «разблокировки»
 * вызывает .load() на HTML5 Audio — это сбрасывает уже играющий трек после первого клика мышью.
 * Воспроизведение и так запускается по клику «Play» (валидный user gesture).
 */
Howler.autoUnlock = false;

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  // one | one-repeat | all | all-repeat
  const [repeatMode, setRepeatMode] = useState('all');
  const [volume, setVolume] = useState(() => {
    const saved = Number(localStorage.getItem('novasound_volume'));
    if (Number.isFinite(saved) && saved >= 0 && saved <= 1) return saved;
    return 1;
  });
  const howlRef = useRef(null);
  const queueRef = useRef([]);
  const queueIndexRef = useRef(0);
  const repeatModeRef = useRef('all');
  const seekHoldUntilRef = useRef(0);
  const seekTargetRef = useRef(0);
  const lastSeekApplyAtRef = useRef(0);

  const normalizeQueue = useCallback((list, fallbackTrack) => {
    const arr = Array.isArray(list) ? list.filter(Boolean) : [];
    if (arr.length > 0) return arr;
    return fallbackTrack ? [fallbackTrack] : [];
  }, []);

  const playQueueTrack = useCallback((track, nextQueue, nextIndex) => {
    if (howlRef.current) {
      howlRef.current.unload();
      howlRef.current = null;
    }
    if (!track) {
      setCurrentTrack(null);
      setPlaying(false);
      setProgress(0);
      setBuffered(0);
      setDuration(0);
      return;
    }
    const token = localStorage.getItem('novasound_token');
    if (!token) return;
    const url = getAudioUrl(track);
    if (!url) return;
    const howl = new Howl({
      src: [url],
      html5: true,
      format: ['mp3', 'ogg', 'm4a', 'wav'],
      volume,
      onload: () => setDuration(howl.duration()),
      onend: () => {
        const mode = repeatModeRef.current;
        const q = queueRef.current;
        const idx = queueIndexRef.current;
        if (mode === 'one-repeat') {
          howl.seek(0);
          howl.play();
          return;
        }
        if (mode === 'one') {
          setPlaying(false);
          setProgress(0);
          return;
        }
        const nextIdx = idx + 1;
        if (nextIdx < q.length) {
          const nextTrack = q[nextIdx];
          if (nextTrack) {
            playQueueTrack(nextTrack, q, nextIdx);
            return;
          }
        }
        if (mode === 'all-repeat' && q.length > 0) {
          playQueueTrack(q[0], q, 0);
          return;
        }
        setPlaying(false);
        setProgress(0);
      },
      onplay: () => setPlaying(true),
      onpause: () => setPlaying(false)
    });
    howlRef.current = howl;
    const safeQueue = normalizeQueue(nextQueue, track);
    const safeIndex = Math.max(0, Math.min(nextIndex, safeQueue.length - 1));
    queueRef.current = safeQueue;
    queueIndexRef.current = safeIndex;
    setQueue(safeQueue);
    setQueueIndex(safeIndex);
    setCurrentTrack(track);
    seekHoldUntilRef.current = 0;
    seekTargetRef.current = 0;
    lastSeekApplyAtRef.current = 0;
    setProgress(0);
    setBuffered(0);
    setDuration(track.duration || 0);
    setPlaying(true);
    howl.play();
    tracksApi.play(track._id).catch(() => {});
  }, [normalizeQueue, volume]);

  const loadTrack = useCallback((track, options = {}) => {
    if (!track) {
      playQueueTrack(null, [], 0);
      return;
    }
    const q = normalizeQueue(options.queue, track);
    let idx = Number.isFinite(options.startIndex) ? Number(options.startIndex) : q.findIndex((t) => String(t?._id) === String(track._id));
    if (idx < 0) idx = 0;
    playQueueTrack(q[idx] || track, q, idx);
  }, [normalizeQueue, playQueueTrack]);

  const playNext = useCallback(() => {
    const q = queueRef.current;
    const idx = queueIndexRef.current;
    if (!q.length) return;
    const nextIdx = idx + 1;
    if (nextIdx < q.length) {
      playQueueTrack(q[nextIdx], q, nextIdx);
      return;
    }
    if (repeatModeRef.current === 'all-repeat') {
      playQueueTrack(q[0], q, 0);
    }
  }, [playQueueTrack]);

  const playPrev = useCallback(() => {
    const q = queueRef.current;
    const idx = queueIndexRef.current;
    if (!q.length) return;
    const h = howlRef.current;
    const pos = h ? Number(h.seek()) : 0;
    if (pos > 3) {
      if (h) h.seek(0);
      setProgress(0);
      return;
    }
    const prevIdx = idx - 1;
    if (prevIdx >= 0) {
      playQueueTrack(q[prevIdx], q, prevIdx);
      return;
    }
    if (repeatModeRef.current === 'all-repeat') {
      const lastIdx = q.length - 1;
      playQueueTrack(q[lastIdx], q, lastIdx);
    }
  }, [playQueueTrack]);

  const cycleRepeatMode = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === 'one') return 'one-repeat';
      if (prev === 'one-repeat') return 'all';
      if (prev === 'all') return 'all-repeat';
      return 'one';
    });
  }, []);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    const clearPlayer = () => {
      if (howlRef.current) {
        howlRef.current.unload();
        howlRef.current = null;
      }
      setCurrentTrack(null);
      setPlaying(false);
      seekHoldUntilRef.current = 0;
      seekTargetRef.current = 0;
      lastSeekApplyAtRef.current = 0;
      setProgress(0);
      setBuffered(0);
      setDuration(0);
      setQueue([]);
      setQueueIndex(0);
      queueRef.current = [];
      queueIndexRef.current = 0;
    };
    window.addEventListener('auth_logout', clearPlayer);
    return () => window.removeEventListener('auth_logout', clearPlayer);
  }, []);

  useEffect(() => {
    const onCover = (e) => {
      const t = e.detail?.track;
      if (!t?._id) return;
      setCurrentTrack((cur) =>
        cur && String(cur._id) === String(t._id) ? { ...cur, coverImage: t.coverImage } : cur
      );
    };
    window.addEventListener('novasound_track_cover', onCover);
    return () => window.removeEventListener('novasound_track_cover', onCover);
  }, []);

  const setPlayerVolume = useCallback((nextVolume) => {
    const v = Math.max(0, Math.min(1, Number(nextVolume) || 0));
    setVolume(v);
    localStorage.setItem('novasound_volume', String(v));
    if (howlRef.current) howlRef.current.volume(v);
  }, []);

  const togglePlay = useCallback(() => {
    if (!howlRef.current) return;
    if (howlRef.current.playing()) {
      howlRef.current.pause();
      setPlaying(false);
    } else {
      howlRef.current.play();
      setPlaying(true);
    }
  }, []);

  const seek = useCallback((value) => {
    if (!howlRef.current) return;
    const next = Math.max(0, Number(value) || 0);
    const h = howlRef.current;
    seekTargetRef.current = next;
    // Держим позицию дольше, если seek в непрогруженную область.
    seekHoldUntilRef.current = Date.now() + 6000;
    lastSeekApplyAtRef.current = Date.now();
    h.seek(next);
    // Если трек играл, в некоторых браузерах после seek нужен явный play().
    if (playing && !h.playing()) {
      h.play();
    }
    setProgress(next);
  }, [playing]);

  /** Остановить и убрать плеер с экрана */
  const closePlayer = useCallback(() => {
    if (howlRef.current) {
      howlRef.current.unload();
      howlRef.current = null;
    }
    setCurrentTrack(null);
    setPlaying(false);
    seekHoldUntilRef.current = 0;
    seekTargetRef.current = 0;
    lastSeekApplyAtRef.current = 0;
    setProgress(0);
    setBuffered(0);
    setDuration(0);
      setQueue([]);
      setQueueIndex(0);
      queueRef.current = [];
      queueIndexRef.current = 0;
  }, []);

  // Только currentTrack — иначе при паузе/плей эффект пересоздаётся и на части браузеров глючит HTML5 Audio
  useEffect(() => {
    const howl = howlRef.current;
    if (!howl) return;
    const tick = () => {
      const h = howlRef.current;
      if (!h) return;
      const pos = h.seek();
      if (typeof pos !== 'number' || Number.isNaN(pos)) return;
      const total = Math.max(Number(h.duration()) || 0, 0);
      const node = h._sounds?.[0]?._node;
      if (node && total > 0 && node.buffered && typeof node.buffered.length === 'number' && node.buffered.length > 0) {
        const end = Number(node.buffered.end(node.buffered.length - 1));
        if (Number.isFinite(end)) {
          setBuffered(Math.max(0, Math.min(total, end)));
        }
      }
      const now = Date.now();
      if (now < seekHoldUntilRef.current && pos + 0.25 < seekTargetRef.current) {
        // Периодически повторяем seek, чтобы браузер активнее запросил нужный диапазон.
        if (now - lastSeekApplyAtRef.current > 900) {
          h.seek(seekTargetRef.current);
          lastSeekApplyAtRef.current = now;
        }
        setProgress(seekTargetRef.current);
        return;
      }
      setProgress(pos);
      if (pos + 0.25 >= seekTargetRef.current) {
        seekHoldUntilRef.current = 0;
      }
    };
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [currentTrack]);

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      playing,
      progress,
      buffered,
      duration,
      queue,
      queueIndex,
      repeatMode,
      volume,
      loadTrack,
      togglePlay,
      playNext,
      playPrev,
      cycleRepeatMode,
      seek,
      setPlayerVolume,
      setProgress,
      setDuration,
      closePlayer
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
