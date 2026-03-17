import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import client from '../api/client';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';

export default function TrackPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const { loadTrack, currentTrack, playing, togglePlay } = usePlayer();
  const { user } = useAuth();

  useEffect(() => {
    client.get(`/tracks/${id}`)
      .then((r) => {
        setTrack(r.data);
        setLiked(Array.isArray(r.data.likes) && user && r.data.likes.some(l => l.toString?.() === user.id || l === user.id));
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id, user?.id]);

  const handlePlay = () => {
    if (track) loadTrack(track);
  };

  const handleLike = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    client.post(`/tracks/${id}/like`)
      .then((r) => {
        setLiked(r.data.liked);
        setTrack((prev) => prev ? { ...prev, likes: r.data.likes } : null);
      })
      .catch(() => {});
  };

  if (loading || !track) {
    return <div className="page"><div className="loading">Загрузка...</div></div>;
  }

  const isCurrent = currentTrack?._id === track._id;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page track-page">
      <div className="track-detail">
        <div
          className="track-detail-cover"
          style={{ backgroundImage: track.coverImage ? `url(${track.coverImage})` : 'linear-gradient(135deg, var(--neon-purple), var(--neon-pink))' }}
        >
          <button type="button" className="big-play" onClick={handlePlay}>
            {isCurrent && playing ? '⏸' : '▶'}
          </button>
        </div>
        <div className="track-detail-info">
          <h1 className="track-detail-title">{track.title}</h1>
          <p className="track-detail-author">{track.author?.username}</p>
          <div className="track-detail-stats">
            <span>▶ {track.plays ?? 0}</span>
            <button type="button" className={`like-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
              ♥ {typeof track.likes === 'number' ? track.likes : (track.likes?.length ?? 0)}
            </button>
          </div>
          {track.description && <p className="track-detail-desc">{track.description}</p>}
          {track.status && track.status !== 'approved' && (
            <p className="track-status-note">Статус: {track.status}</p>
          )}
        </div>
      </div>
      <style>{`
        .track-page { max-width: 700px; margin: 0 auto; }
        .track-detail { display: flex; flex-direction: column; gap: 24px; }
        .track-detail-cover {
          aspect-ratio: 1;
          max-width: 320px;
          border-radius: 16px;
          background-size: cover;
          background-position: center;
          border: 2px solid var(--neon-cyan);
          box-shadow: 0 0 40px rgba(5, 217, 232, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .big-play {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 3px solid var(--neon-pink);
          background: rgba(255, 42, 109, 0.4);
          color: #fff;
          font-size: 2rem;
          box-shadow: 0 0 30px rgba(255, 42, 109, 0.5);
        }
        .big-play:hover { background: rgba(255, 42, 109, 0.6); }
        .track-detail-title { font-size: 1.8rem; color: var(--neon-cyan); margin-bottom: 8px; }
        .track-detail-author { color: var(--text-dim); margin-bottom: 12px; }
        .track-detail-stats { display: flex; gap: 16px; margin-bottom: 16px; }
        .like-btn {
          border: 1px solid var(--neon-pink);
          background: transparent;
          color: var(--neon-pink);
          padding: 6px 12px;
          border-radius: 6px;
        }
        .like-btn.liked { background: rgba(255, 42, 109, 0.3); }
        .track-detail-desc { color: var(--text-dim); line-height: 1.6; }
        .track-status-note { color: #ffc800; font-size: 0.9rem; }
        .loading { text-align: center; padding: 48px; color: var(--text-dim); }
      `}</style>
    </motion.div>
  );
}
