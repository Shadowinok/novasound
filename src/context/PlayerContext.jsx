import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { tracks as tracksApi, getAudioUrl, getPublicAudioUrl } from '../api/client';

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
  const [isRadioMode, setIsRadioMode] = useState(false);
  const [volume, setVolume] = useState(() => {
    const saved = Number(localStorage.getItem('novasound_volume'));
    if (Number.isFinite(saved) && saved >= 0 && saved <= 1) return saved;
    return 1;
  });
  const audioRef = useRef(null);
  /** 1 = норма; меньше 1 — только выход громкости элемента Audio (ползунок и volume в state не меняем) */
  const musicDuckMultiplierRef = useRef(1);
  const volumeRef = useRef(volume);
  const isRadioModeRef = useRef(false);
  const queueRef = useRef([]);
  const queueIndexRef = useRef(0);
  const repeatModeRef = useRef('all');
  const desiredPlayingRef = useRef(false);
  const pausedByHostRef = useRef(false);
  const radioAutoResumeCooldownRef = useRef(0);
  const radioSwitchingAfterEndRef = useRef(false);
  /** Следующий трек после естественного окончания (та же логика, что в audio `ended` для радио). */
  const advanceRadioFromEndedRef = useRef(async () => {});
  const playerDebugRef = useRef(localStorage.getItem('novasound_player_debug') === '1');

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  const debugLog = useCallback((event, payload = {}) => {
    if (!playerDebugRef.current) return;
    // eslint-disable-next-line no-console
    console.debug(`[player] ${event}`, payload);
  }, []);

  const releaseAudio = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.src = '';
    audioRef.current.load();
    audioRef.current = null;
    musicDuckMultiplierRef.current = 1;
  }, []);

  const resetPlayerState = useCallback(() => {
    setCurrentTrack(null);
    setPlaying(false);
    desiredPlayingRef.current = false;
    setProgress(0);
    setBuffered(0);
    setDuration(0);
    setQueue([]);
    setQueueIndex(0);
    setIsRadioMode(false);
    isRadioModeRef.current = false;
    queueRef.current = [];
    queueIndexRef.current = 0;
    musicDuckMultiplierRef.current = 1;
  }, []);

  const normalizeQueue = useCallback((list, fallbackTrack) => {
    const arr = Array.isArray(list) ? list.filter(Boolean) : [];
    if (arr.length > 0) return arr;
    return fallbackTrack ? [fallbackTrack] : [];
  }, []);

  const playQueueTrack = useCallback((track, nextQueue, nextIndex, opts = {}) => {
    releaseAudio();
    radioSwitchingAfterEndRef.current = false;
    if (!track) {
      resetPlayerState();
      return;
    }
    const token = localStorage.getItem('novasound_token');
    const allowGuestRadio = Boolean(opts.isRadioPublic);
    if (!token && !allowGuestRadio) return;
    const url = token ? getAudioUrl(track) : getPublicAudioUrl(track);
    if (!url) return;
    debugLog('load-track', { trackId: track._id, title: track.title });
    const audio = new Audio(url);
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    {
      const v = volumeRef.current;
      const m = musicDuckMultiplierRef.current;
      audio.volume = Math.min(1, v * m);
    }

    const startAtSec = Number(opts.startAtSec);
    let startApplied = false;
    const applyStartOffset = () => {
      if (startApplied) return;
      if (!Number.isFinite(startAtSec) || startAtSec <= 0) return;
      const d = Number(audio.duration);
      const maxSeek = Number.isFinite(d) && d > 1 ? Math.max(0, d - 1) : startAtSec;
      const target = Math.max(0, Math.min(startAtSec, maxSeek));
      try {
        audio.currentTime = target;
        setProgress(target);
        startApplied = true;
      } catch (_) {}
    };

    audio.addEventListener('loadedmetadata', () => {
      const d = Number(audio.duration);
      if (Number.isFinite(d) && d > 0) setDuration(d);
      applyStartOffset();
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
    audio.addEventListener('pause', () => {
      setPlaying(false);
      // Иногда браузер ставит audio на паузу при навигации/параллельных аудио.
      // В радио-режиме аккуратно пытаемся вернуть воспроизведение,
      // но только если мы "ожидаем играть" (пауза не от пользователя).
      if (!isRadioModeRef.current) return;
      if (!desiredPlayingRef.current) return;
      if (audioRef.current !== audio) return;
      if (pausedByHostRef.current) return;
      if (radioSwitchingAfterEndRef.current) return;
      if (audio.ended) return;
      const d = Number(audio.duration);
      const t = Number(audio.currentTime);
      if (Number.isFinite(d) && d > 0 && Number.isFinite(t) && d - t < 1.2) return;
      const now = Date.now();
      if (now - radioAutoResumeCooldownRef.current < 1500) return;
      radioAutoResumeCooldownRef.current = now;
      window.setTimeout(() => {
        if (audioRef.current !== audio) return;
        audio.play()
          .then(() => setPlaying(true))
          .catch(() => {});
      }, 350);
    });
    audio.addEventListener('seeking', () => debugLog('seeking', { to: audio.currentTime }));
    audio.addEventListener('seeked', () => debugLog('seeked', { to: audio.currentTime }));
    audio.addEventListener('waiting', () => debugLog('waiting', { at: audio.currentTime }));
    audio.addEventListener('canplay', () => debugLog('canplay', { at: audio.currentTime }));
    audio.addEventListener('canplay', applyStartOffset);

    audio.addEventListener('ended', () => {
      radioSwitchingAfterEndRef.current = true;
      if (isRadioModeRef.current) {
        const endedId = track?._id ? String(track._id) : '';
        const ev = new CustomEvent('novasound_radio_track_ended', {
          cancelable: true,
          detail: { endedId }
        });
        window.dispatchEvent(ev);
        if (ev.defaultPrevented) {
          return;
        }
        void advanceRadioFromEndedRef.current(endedId);
        return;
      }

      const mode = repeatModeRef.current;
      const q = queueRef.current;
      const idx = queueIndexRef.current;
      if (mode === 'one-repeat') {
        radioSwitchingAfterEndRef.current = false;
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      if (mode === 'one') {
        radioSwitchingAfterEndRef.current = false;
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
      radioSwitchingAfterEndRef.current = false;
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
      debugLog('play-failed', { trackId: track._id });
    });
    if (token) tracksApi.play(track._id).catch(() => {});
  }, [debugLog, normalizeQueue, releaseAudio, resetPlayerState]);

  /** То же, что раньше выполнялось в `ended` для радио до переключения трека (в т.ч. после речи ведущего между песнями). */
  const advanceRadioQueueAfterTrackEnd = useCallback(async (endedId) => {
    const token = localStorage.getItem('novasound_token');
    const isRadioPublic = !token;
    try {
      const { data } = await tracksApi.radioNow({ limit: 30 });
      const now = data?.now || null;
      const q = Array.isArray(data?.queue) ? data.queue : [];
      if (now && q.length) {
        let idx = q.findIndex((t) => String(t?._id) === String(now?._id));
        if (idx < 0) idx = 0;
        if (endedId && String(q[idx]?._id || '') === endedId && q.length > 1) {
          const nextIdx = (idx + 1) % q.length;
          playQueueTrack(q[nextIdx], q, nextIdx, { startAtSec: 0, isRadioPublic });
          return;
        }
        playQueueTrack(q[idx] || now, q, idx, { startAtSec: 0, isRadioPublic });
        return;
      }
      radioSwitchingAfterEndRef.current = false;
      setPlaying(false);
      setProgress(0);
    } catch (_) {
      radioSwitchingAfterEndRef.current = false;
      setPlaying(false);
      setProgress(0);
    }
  }, [playQueueTrack]);

  advanceRadioFromEndedRef.current = advanceRadioQueueAfterTrackEnd;

  const loadTrack = useCallback((track, options = {}) => {
    if (!track) {
      playQueueTrack(null, [], 0);
      return;
    }
    const radioMode = Boolean(options.isRadio);
    setIsRadioMode(radioMode);
    isRadioModeRef.current = radioMode;
    if (radioMode) {
      setRepeatMode('all');
    }
    const q = normalizeQueue(options.queue, track);
    const trackId = String(track?._id || '');
    const foundIdx = q.findIndex((t) => String(t?._id) === trackId);
    let idx = Number.isFinite(options.startIndex) ? Number(options.startIndex) : foundIdx;
    // Защита от рассинхрона: если startIndex указывает не на тот трек, используем фактический индекс track в очереди.
    if (idx >= 0 && idx < q.length && String(q[idx]?._id || '') !== trackId && foundIdx >= 0) {
      idx = foundIdx;
    }
    if (idx < 0) idx = 0;
    playQueueTrack(q[idx] || track, q, idx, {
      startAtSec: options.startAtSec,
      isRadioPublic: options.isRadioPublic
    });
  }, [normalizeQueue, playQueueTrack]);

  /** Для "честного" брейка между треками: после речи ведущего перейти на следующий радио-трек. */
  const advanceRadioAfterHost = useCallback(async (currentTrackId = '') => {
    if (!isRadioModeRef.current) return false;
    const token = localStorage.getItem('novasound_token');
    const isRadioPublic = !token;
    try {
      const { data } = await tracksApi.radioNow({ limit: 30 });
      const now = data?.now || null;
      const q = Array.isArray(data?.queue) ? data.queue : [];
      if (!q.length) return false;

      const currentId = currentTrackId ? String(currentTrackId) : '';
      let serverIdx = q.findIndex((t) => String(t?._id) === String(now?._id || ''));
      if (serverIdx < 0) serverIdx = 0;

      let nextIdx = serverIdx;
      if (currentId) {
        const currentIdxInQueue = q.findIndex((t) => String(t?._id) === currentId);
        if (currentIdxInQueue >= 0 && currentIdxInQueue + 1 < q.length) {
          nextIdx = currentIdxInQueue + 1;
        } else if (String(q[serverIdx]?._id || '') === currentId && q.length > 1) {
          nextIdx = (serverIdx + 1) % q.length;
        }
      }

      playQueueTrack(q[nextIdx] || now || q[0], q, Math.max(0, nextIdx), { startAtSec: 0, isRadioPublic });
      return true;
    } catch (_) {
      return false;
    }
  }, [playQueueTrack]);

  const playNext = useCallback(() => {
    if (isRadioMode) return;
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
  }, [isRadioMode, playQueueTrack]);

  const playPrev = useCallback(() => {
    if (isRadioMode) return;
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
  }, [isRadioMode, playQueueTrack]);

  const cycleRepeatMode = useCallback(() => {
    if (isRadioMode) return;
    setRepeatMode((prev) => {
      if (prev === 'one') return 'one-repeat';
      if (prev === 'one-repeat') return 'all';
      if (prev === 'all') return 'all-repeat';
      return 'one';
    });
  }, [isRadioMode]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    const clearPlayer = () => {
      releaseAudio();
      resetPlayerState();
    };
    window.addEventListener('auth_logout', clearPlayer);
    return () => window.removeEventListener('auth_logout', clearPlayer);
  }, [releaseAudio, resetPlayerState]);

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
    volumeRef.current = v;
    localStorage.setItem('novasound_volume', String(v));
    if (audioRef.current) {
      const m = musicDuckMultiplierRef.current;
      audioRef.current.volume = Math.min(1, v * m);
    }
  }, []);

  /** Временная пауза музыки для реплики ведущего (без смены трека/очереди). */
  const pauseForHost = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) return;
    pausedByHostRef.current = true;
    desiredPlayingRef.current = false;
    try { audioRef.current.pause(); } catch (_) {}
  }, []);

  const resumeAfterHost = useCallback(() => {
    if (!audioRef.current) return;
    if (!pausedByHostRef.current) return;
    pausedByHostRef.current = false;
    desiredPlayingRef.current = true;
    audioRef.current.play()
      .then(() => setPlaying(true))
      .catch(() => {
        desiredPlayingRef.current = false;
      });
  }, []);

  /** Приглушить только музыку (ведущий / наложения); ползунок и сохранённая громкость — громкость пользователя */
  const applyMusicDuck = useCallback((multiplier) => {
    const m = Math.max(0, Math.min(1, Number(multiplier)));
    musicDuckMultiplierRef.current = m;
    if (audioRef.current) {
      const v = volumeRef.current;
      audioRef.current.volume = Math.min(1, v * m);
    }
  }, []);

  const releaseMusicDuck = useCallback(() => {
    musicDuckMultiplierRef.current = 1;
    if (audioRef.current) {
      audioRef.current.volume = volumeRef.current;
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (desiredPlayingRef.current) {
      desiredPlayingRef.current = false;
      audioRef.current.pause();
      setPlaying(false);
      debugLog('pause');
    } else {
      if (isRadioMode) {
        const token = localStorage.getItem('novasound_token');
        const isRadioPublic = !token;
        tracksApi.radioNow({ limit: 30 })
          .then(({ data }) => {
            const now = data?.now || null;
            const q = Array.isArray(data?.queue) ? data.queue : [];
            if (now && q.length) {
              const nowIdx = q.findIndex((t) => String(t?._id) === String(now?._id));
              // При ручном возврате в радио не догоняем оффсет, чтобы не прыгать по середине трека.
              loadTrack(now, { queue: q, startIndex: nowIdx >= 0 ? nowIdx : 0, isRadio: true, isRadioPublic, startAtSec: 0 });
              return;
            }
            desiredPlayingRef.current = true;
            audioRef.current.play()
              .then(() => setPlaying(true))
              .catch(() => {
                desiredPlayingRef.current = false;
                setPlaying(false);
              });
          })
          .catch(() => {
            desiredPlayingRef.current = true;
            audioRef.current.play()
              .then(() => setPlaying(true))
              .catch(() => {
                desiredPlayingRef.current = false;
                setPlaying(false);
              });
          });
        return;
      }
      desiredPlayingRef.current = true;
      audioRef.current.play()
        .then(() => {
          setPlaying(true);
          debugLog('play');
        })
        .catch(() => {
          desiredPlayingRef.current = false;
          setPlaying(false);
          debugLog('play-failed');
        });
    }
  }, [debugLog, isRadioMode, loadTrack]);

  const seek = useCallback((value) => {
    if (isRadioMode) return;
    if (!audioRef.current) return;
    const next = Math.max(0, Number(value) || 0);
    audioRef.current.currentTime = next;
    debugLog('seek', { to: next });
    if (desiredPlayingRef.current) {
      audioRef.current.play().catch(() => {});
      setPlaying(true);
    } else {
      audioRef.current.pause();
      setPlaying(false);
    }
    setProgress(next);
  }, [debugLog, isRadioMode]);

  /** Остановить и убрать плеер с экрана */
  const closePlayer = useCallback(() => {
    releaseAudio();
    resetPlayerState();
  }, [releaseAudio, resetPlayerState]);

  useEffect(() => () => {
    releaseAudio();
  }, [releaseAudio]);

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
      isRadioMode,
      volume,
      loadTrack,
      togglePlay,
      playNext,
      playPrev,
      cycleRepeatMode,
      seek,
      setPlayerVolume,
      pauseForHost,
      resumeAfterHost,
      applyMusicDuck,
      releaseMusicDuck,
      advanceRadioAfterHost,
      advanceRadioQueueAfterTrackEnd,
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
