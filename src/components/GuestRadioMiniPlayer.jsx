import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { tracks as tracksApi, getPublicAudioUrl } from '../api/client';

export default function GuestRadioMiniPlayer() {
  const audioRef = useRef(null);
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);

  const fetchRadioNow = useCallback(async () => {
    const { data } = await tracksApi.radioNow({ limit: 20 });
    const q = Array.isArray(data?.queue) ? data.queue : [];
    const now = data?.now || q[0] || null;
    return { now, queue: q, startAtSec: Number(data?.nowOffsetSec) || 0 };
  }, []);

  const playTrack = useCallback((track, startAtSec = 0) => {
    if (!track) return false;
    const url = getPublicAudioUrl(track);
    if (!url) return false;
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch (_) {}
      audioRef.current.src = '';
    }
    const a = new Audio(url);
    a.preload = 'auto';
    a.crossOrigin = 'anonymous';
    a.volume = 0.9;
    a.addEventListener('loadedmetadata', () => {
      const d = Number(a.duration);
      if (Number.isFinite(d)) setDuration(d);
      const target = Math.max(0, Number(startAtSec) || 0);
      if (target > 0 && Number.isFinite(d) && d > 2) {
        try { a.currentTime = Math.min(target, d - 1); } catch (_) {}
      }
    });
    a.addEventListener('timeupdate', () => setProgress(Number(a.currentTime) || 0));
    a.addEventListener('progress', () => {
      try {
        if (a.buffered.length > 0) {
          const end = Number(a.buffered.end(a.buffered.length - 1));
          if (Number.isFinite(end)) setBuffered(end);
        }
      } catch (_) {}
    });
    a.addEventListener('play', () => setPlaying(true));
    a.addEventListener('pause', () => setPlaying(false));
    a.addEventListener('waiting', () => setLoading(true));
    a.addEventListener('canplay', () => setLoading(false));
    a.addEventListener('ended', async () => {
      setLoading(true);
      try {
        const snap = await fetchRadioNow();
        setQueue(snap.queue);
        setCurrent(snap.now);
        playTrack(snap.now, snap.startAtSec);
      } catch (_) {
        setPlaying(false);
      } finally {
        setLoading(false);
      }
    });
    audioRef.current = a;
    setCurrent(track);
    setProgress(0);
    setBuffered(0);
    setDuration(Number(track.duration) || 0);
    a.play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
    return true;
  }, [fetchRadioNow]);

  const togglePlay = useCallback(async () => {
    if (audioRef.current) {
      if (playing) {
        audioRef.current.pause();
      } else {
        const p = audioRef.current.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
      return;
    }
    setLoading(true);
    try {
      const snap = await fetchRadioNow();
      setQueue(snap.queue);
      playTrack(snap.now, snap.startAtSec);
    } catch (_) {
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  }, [fetchRadioNow, playTrack, playing]);

  useEffect(() => () => {
    if (!audioRef.current) return;
    try { audioRef.current.pause(); } catch (_) {}
    audioRef.current.src = '';
  }, []);

  const title = useMemo(() => String(current?.title || 'Радио'), [current]);
  const max = duration > 0 ? duration : 1;
  const playedPct = Math.max(0, Math.min(100, (progress / max) * 100));
  const loadedPct = Math.max(0, Math.min(100, (buffered / max) * 100));

  return (
    <div className="guest-mini-player" aria-label="Мини-плеер радио">
      <button type="button" className="guest-mini-player__btn" onClick={togglePlay} aria-label="Плей пауза">
        {playing ? '❚❚' : '▶'}
      </button>
      <div className="guest-mini-player__progress">
        <div className="guest-mini-player__load" style={{ width: `${loadedPct}%` }} />
        <div className="guest-mini-player__play" style={{ width: `${playedPct}%` }} />
        <span className={`guest-mini-player__dot ${loading ? 'is-loading' : ''}`} />
      </div>
      <div className="guest-mini-player__ticker-wrap">
        <div className="guest-mini-player__ticker">{title} • {title} •</div>
      </div>
    </div>
  );
}
