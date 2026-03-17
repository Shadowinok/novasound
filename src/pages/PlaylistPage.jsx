import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import client from '../api/client';
import TrackCard from '../components/TrackCard';

export default function PlaylistPage() {
  const { id } = useParams();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get(`/playlists/${id}`)
      .then((r) => setPlaylist(r.data))
      .catch(() => setPlaylist(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !playlist) {
    return <div className="page"><div className="loading">Загрузка...</div></div>;
  }

  const tracks = (playlist.tracks || []).filter(Boolean);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page">
      <div className="playlist-header">
        <div
          className="playlist-header-cover"
          style={{ backgroundImage: playlist.coverImage ? `url(${playlist.coverImage})` : 'linear-gradient(135deg, var(--neon-purple), var(--neon-pink))' }}
        />
        <div>
          <h1 className="playlist-header-title">{playlist.title}</h1>
          {playlist.description && <p className="playlist-header-desc">{playlist.description}</p>}
          <p className="playlist-header-meta">Треков: {tracks.length}</p>
        </div>
      </div>
      <div className="track-grid">
        {tracks.map((t) => (
          <TrackCard key={t._id} track={t} />
        ))}
      </div>
      <style>{`
        .playlist-header {
          display: flex;
          gap: 24px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }
        .playlist-header-cover {
          width: 200px;
          height: 200px;
          border-radius: 12px;
          background-size: cover;
          border: 2px solid var(--neon-cyan);
        }
        .playlist-header-title { font-size: 1.8rem; color: var(--neon-cyan); margin-bottom: 8px; }
        .playlist-header-desc, .playlist-header-meta { color: var(--text-dim); margin-bottom: 4px; }
        .track-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 20px;
        }
        .loading { text-align: center; padding: 48px; color: var(--text-dim); }
      `}</style>
    </motion.div>
  );
}
