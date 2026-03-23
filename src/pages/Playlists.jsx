import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { playlists as playlistsApi } from '../api/client';

export default function Playlists() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    playlistsApi.list().then((r) => setList(r.data || [])).catch(() => []).finally(() => setLoading(false));
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page playlists-page">
      <h2 className="page-title">Плейлисты</h2>
      <p className="playlists-lead">
        Подборки редакции NovaSound. Собрать свой список можно в личном кабинете.
      </p>
      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : list.length === 0 ? (
        <div className="empty">Плейлистов пока нет</div>
      ) : (
        <div className="playlist-grid">
          {list.map((p) => (
            <Link key={p._id} to={`/playlist/${p._id}`} className="playlist-card">
              <div
                className="playlist-cover"
                style={{ backgroundImage: p.coverImage ? `url(${p.coverImage})` : 'linear-gradient(135deg, var(--neon-purple), var(--neon-pink))' }}
              />
              <span className="playlist-title">{p.title}</span>
              {p.description && <span className="playlist-desc">{p.description}</span>}
            </Link>
          ))}
        </div>
      )}
      <style>{`
        .playlists-page {
          max-width: 1100px;
          margin: 0 auto;
          padding-left: 280px;
          padding-right: 24px;
        }
        .page-title { color: var(--neon-cyan); margin-bottom: 12px; }
        .playlists-lead {
          color: var(--text-dim);
          font-size: 0.95rem;
          line-height: 1.45;
          max-width: 560px;
          margin: 0 0 24px;
        }
        .playlist-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 24px;
        }
        .playlist-card {
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(211, 0, 197, 0.3);
          text-decoration: none;
          color: inherit;
        }
        .playlist-card:hover { box-shadow: 0 0 25px rgba(211, 0, 197, 0.4); }
        .playlist-cover { aspect-ratio: 1; background-size: cover; background-position: center; }
        .playlist-title { display: block; padding: 12px; font-family: var(--font-display); color: var(--neon-cyan); }
        .playlist-desc { display: block; padding: 0 12px 12px; font-size: 0.85rem; color: var(--text-dim); }
        .loading, .empty { text-align: center; padding: 48px; color: var(--text-dim); }
        @media (max-width: 900px) {
          .playlists-page { padding-left: 0; padding-right: 0; }
        }
      `}</style>
    </motion.div>
  );
}
