import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { tracks as tracksApi, getAudioUrl } from '../api/client';

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
  const audioRef = useRef(null);
  const queueRef = useRef([]);
  const queueIndexRef = useRef(0);
  const repeatModeRef = useRef('all');
  const desiredPlayingRef = useRef(false);

  const normalizeQueue = useCallback((list, fallbackTrack) => {
    const arr = Array.isArray(list) ? list.filter(Boolean) : [];
    if (arr.length > 0) return arr;
    return fallbackTrack ? [fallbackTrack] : [];
  }, []);

  const playQueueTrack = useCallback((track, nextQueue, nextIndex) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current.load();
      audioRef.current = null;
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
    const audio = new Audio(url);
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audio.volume = volume;

    audio.addEventListener('loadedmetadata', () => {
      const d = Number(audio.duration);
      if (Number.isFinite(d) && d > 0) setDuration(d);
    });

    audio.addEventListener('timeupdate', () => {
      const p = Number(audio.currentTime);
      if (Number.isFinite(p)) setProgress(p);
    });

    audio.addEventListener('progress', () => {
      const d = Number(audio.duration);
      if (!Number.isFinite(d) || d <= 0) return;
      try {
        if (audio.buffered.length > 0) {
          const end = Number(audio.buffered.end(audio.buffered.length - 1));
          if (Number.isFinite(end)) setBuffered(Math.max(0, Math.min(d, end)));
        }
      } catch (_) {}
    });

    audio.addEventListener('play', () => setPlaying(true));
    audio.addEventListener('pause', () => setPlaying(false));

    audio.addEventListener('ended', () => {
      const mode = repeatModeRef.current;
      const q = queueRef.current;
      const idx = queueIndexRef.current;
      if (mode === 'one-repeat') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
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
    });

    audioRef.current = audio;
    const safeQueue = normalizeQueue(nextQueue, track);
    const safeIndex = Math.max(0, Math.min(nextIndex, safeQueue.length - 1));
    queueRef.current = safeQueue;
    queueIndexRef.current = safeIndex;
    setQueue(safeQueue);
    setQueueIndex(safeIndex);
    setCurrentTrack(track);
    desiredPlayingRef.current = true;
    setProgress(0);
    setBuffered(0);
    setDuration(track.duration || 0);
    setPlaying(true);
    audio.play().catch(() => {
      setPlaying(false);
      desiredPlayingRef.current = false;
    });
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
    const a = audioRef.current;
    const pos = a ? Number(a.currentTime) : 0;
    if (pos > 3) {
      if (a) a.currentTime = 0;
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
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.load();
        audioRef.current = null;
      }
      setCurrentTrack(null);
      setPlaying(false);
      desiredPlayingRef.current = false;
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
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (desiredPlayingRef.current) {
      desiredPlayingRef.current = false;
      audioRef.current.pause();
      setPlaying(false);
    } else {
      desiredPlayingRef.current = true;
      audioRef.current.play()
        .then(() => setPlaying(true))
        .catch(() => {
          desiredPlayingRef.current = false;
          setPlaying(false);
        });
    }
  }, []);

  const seek = useCallback((value) => {
    if (!audioRef.current) return;
    const next = Math.max(0, Number(value) || 0);
    audioRef.current.currentTime = next;
    if (desiredPlayingRef.current) {
      audioRef.current.play().catch(() => {});
      setPlaying(true);
    } else {
      audioRef.current.pause();
      setPlaying(false);
    }
    setProgress(next);
  }, []);

  /** Остановить и убрать плеер с экрана */
  const closePlayer = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current.load();
      audioRef.current = null;
    }
    setCurrentTrack(null);
    setPlaying(false);
    desiredPlayingRef.current = false;
    setProgress(0);
    setBuffered(0);
    setDuration(0);
      setQueue([]);
      setQueueIndex(0);
      queueRef.current = [];
      queueIndexRef.current = 0;
  }, []);

  useEffect(() => () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current.load();
      audioRef.current = null;
    }
  }, []);

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
