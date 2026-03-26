import React, { useCallback, useMemo, useState } from 'react';
import { tracks as tracksApi } from '../api/client';
import { usePlayer } from '../context/PlayerContext';

export default function GuestRadioMiniPlayer() {
  const {
    currentTrack,
    playing,
    progress,
    buffered,
    duration,
    isRadioMode,
    togglePlay: toggleMainPlay,
    loadTrack
  } = usePlayer();
  const [loading, setLoading] = useState(false);

  const fetchRadioNow = useCallback(async () => {
    const { data } = await tracksApi.radioNow({ limit: 20 });
    const q = Array.isArray(data?.queue) ? data.queue : [];
    const now = data?.now || q[0] || null;
    let idx = q.findIndex((t) => String(t?._id) === String(now?._id));
    if (idx < 0) idx = 0;
    return { now, queue: q, queueIndex: idx, startAtSec: Number(data?.nowOffsetSec) || 0 };
  }, []);

  const toggleGuestPlay = useCallback(async () => {
    if (isRadioMode && currentTrack) {
      if (playing) {
        toggleMainPlay();
      } else {
        toggleMainPlay();
      }
      return;
    }
    setLoading(true);
    try {
      const snap = await fetchRadioNow();
      if (snap.now && snap.queue.length) {
        loadTrack(snap.now, {
          queue: snap.queue,
          startIndex: snap.queueIndex,
          isRadio: true,
          isRadioPublic: true,
          startAtSec: snap.startAtSec
        });
      }
    } catch (_) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [currentTrack, fetchRadioNow, isRadioMode, loadTrack, playing, toggleMainPlay]);

  const title = useMemo(() => String(currentTrack?.title || 'Радио'), [currentTrack]);
  const max = duration > 0 ? duration : 1;
  const playedPct = Math.max(0, Math.min(100, (progress / max) * 100));
  const loadedPct = Math.max(0, Math.min(100, (buffered / max) * 100));

  return (
    <div className="guest-mini-player" aria-label="Мини-плеер радио">
      <button type="button" className="guest-mini-player__btn" onClick={toggleGuestPlay} aria-label="Плей пауза">
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
