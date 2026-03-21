import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { Howl } from 'howler';
import { tracks as tracksApi, getAudioUrl } from '../api/client';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    const saved = Number(localStorage.getItem('novasound_volume'));
    if (Number.isFinite(saved) && saved >= 0 && saved <= 1) return saved;
    return 1;
  });
  const howlRef = useRef(null);

  const loadTrack = useCallback((track) => {
    if (howlRef.current) {
      howlRef.current.unload();
      howlRef.current = null;
    }
    if (!track) {
      setCurrentTrack(null);
      setPlaying(false);
      setProgress(0);
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
        setPlaying(false);
        setProgress(0);
      },
      onplay: () => setPlaying(true),
      onpause: () => setPlaying(false),
      xhrWithCredentials: true
    });
    howlRef.current = howl;
    setCurrentTrack(track);
    setProgress(0);
    setDuration(track.duration || 0);
    setPlaying(true);
    howl.play();
    tracksApi.play(track._id).catch(() => {});
  }, []);

  useEffect(() => {
    const clearPlayer = () => {
      if (howlRef.current) {
        howlRef.current.unload();
        howlRef.current = null;
      }
      setCurrentTrack(null);
      setPlaying(false);
      setProgress(0);
      setDuration(0);
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
    howlRef.current.seek(value);
    setProgress(value);
  }, []);

  useEffect(() => {
    const howl = howlRef.current;
    if (!howl) return;
    const tick = () => setProgress(howl.seek());
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [currentTrack, playing]);

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      playing,
      progress,
      duration,
      volume,
      loadTrack,
      togglePlay,
      seek,
      setPlayerVolume,
      setProgress,
      setDuration
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
