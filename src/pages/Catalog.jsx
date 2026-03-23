import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import client from '../api/client';
import TrackCard from '../components/TrackCard';

export default function Catalog() {
  const [tracks, setTracks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState('-createdAt');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      const q = searchInput.trim();
      setSearch(q);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setLoading(true);
    client.get('/tracks', { params: { page, limit: 20, search: search || undefined, sort } })
      .then((r) => {
        setTracks(r.data.tracks || []);
        setTotal(r.data.total || 0);
      })
      .catch(() => setTracks([]))
      .finally(() => setLoading(false));
  }, [page, search, sort]);

  const pages = Math.ceil(total / 20) || 1;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page catalog">
      <h2 className="page-title">Каталог треков</h2>
      <div className="catalog-toolbar">
        <input
          type="search"
          placeholder="Поиск по названию и описанию..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="search-input"
        />
        <select
          className="sort-select"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
        >
          <option value="-createdAt">Сначала новые</option>
          <option value="createdAt">Сначала старые</option>
          <option value="-plays">По прослушиваниям (↓)</option>
          <option value="plays">По прослушиваниям (↑)</option>
          <option value="title">По названию (А-Я)</option>
          <option value="-title">По названию (Я-А)</option>
        </select>
        <button
          type="button"
          className="reset-btn"
          onClick={() => {
            setSearchInput('');
            setSearch('');
            setSort('-createdAt');
            setPage(1);
          }}
        >
          Сброс
        </button>
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
        .catalog {
          max-width: 1100px;
          margin: 0 auto;
          padding-left: 280px;
          padding-right: 24px;
        }
        .catalog-toolbar {
          margin-bottom: 24px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }
        .search-input {
          width: min(100%, 460px);
          padding: 12px 16px;
          border: 1px solid rgba(5, 217, 232, 0.4);
          border-radius: 8px;
          background: rgba(0,0,0,0.3);
          color: var(--text);
          font-size: 1rem;
        }
        .sort-select {
          min-width: 210px;
          padding: 12px 14px;
          border: 1px solid rgba(5, 217, 232, 0.4);
          border-radius: 8px;
          background: rgba(0,0,0,0.3);
          color: var(--text);
          font-size: 0.95rem;
        }
        .reset-btn {
          padding: 12px 14px;
          border: 1px solid rgba(255, 42, 109, 0.5);
          border-radius: 8px;
          background: transparent;
          color: var(--neon-pink);
          font-size: 0.9rem;
        }
        .reset-btn:hover { background: rgba(255, 42, 109, 0.12); }
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
        @media (max-width: 900px) {
          .catalog { padding-left: 0; padding-right: 0; }
        }
      `}</style>
    </motion.div>
  );
}
