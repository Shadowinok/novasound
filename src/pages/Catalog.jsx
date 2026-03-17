import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import client from '../api/client';
import TrackCard from '../components/TrackCard';

export default function Catalog() {
  const [tracks, setTracks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    client.get('/tracks', { params: { page, limit: 20, search: search || undefined, sort: '-createdAt' } })
      .then((r) => {
        setTracks(r.data.tracks || []);
        setTotal(r.data.total || 0);
      })
      .catch(() => setTracks([]))
      .finally(() => setLoading(false));
  }, [page, search]);

  const pages = Math.ceil(total / 20) || 1;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page catalog">
      <h2 className="page-title">Каталог треков</h2>
      <div className="catalog-toolbar">
        <input
          type="search"
          placeholder="Поиск по названию..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="search-input"
        />
      </div>
      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : tracks.length === 0 ? (
        <div className="empty">Треков пока нет</div>
      ) : (
        <>
          <div className="track-grid">
            {tracks.map((t) => (
              <TrackCard key={t._id} track={t} />
            ))}
          </div>
          {pages > 1 && (
            <div className="pagination">
              <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>←</button>
              <span>{page} / {pages}</span>
              <button type="button" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>→</button>
            </div>
          )}
        </>
      )}
      <style>{`
        .page-title { color: var(--neon-cyan); margin-bottom: 24px; font-size: 1.5rem; }
        .catalog-toolbar { margin-bottom: 24px; }
        .search-input {
          width: 100%;
          max-width: 400px;
          padding: 12px 16px;
          border: 1px solid rgba(5, 217, 232, 0.4);
          border-radius: 8px;
          background: rgba(0,0,0,0.3);
          color: var(--text);
          font-size: 1rem;
        }
        .search-input:focus {
          outline: none;
          box-shadow: 0 0 15px rgba(5, 217, 232, 0.3);
        }
        .track-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 20px;
        }
        .loading, .empty {
          text-align: center;
          padding: 48px;
          color: var(--text-dim);
        }
        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 32px;
        }
        .pagination button {
          padding: 8px 16px;
          border: 1px solid var(--neon-cyan);
          background: transparent;
          color: var(--neon-cyan);
          border-radius: 6px;
        }
        .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
        .pagination button:not(:disabled):hover { background: rgba(5, 217, 232, 0.2); }
      `}</style>
    </motion.div>
  );
}
