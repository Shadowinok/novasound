import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import client from '../api/client';
import TrackCard from '../components/TrackCard';
import UploadTrack from '../components/UploadTrack';

export default function Profile() {
  const [tracks, setTracks] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMyTracks = () => {
    setLoading(true);
    client.get('/tracks/my', { params: statusFilter ? { status: statusFilter } : {} })
      .then((r) => setTracks(r.data || []))
      .catch(() => setTracks([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMyTracks();
  }, [statusFilter]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page profile-page">
      <h2 className="page-title">Мои треки</h2>
      <div className="profile-toolbar">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="profile-select"
        >
          <option value="">Все статусы</option>
          <option value="pending">На модерации</option>
          <option value="approved">Одобрены</option>
          <option value="rejected">Отклонены</option>
        </select>
        <button type="button" className="neon-btn" onClick={() => setShowUpload(true)}>Загрузить трек</button>
      </div>
      {showUpload && (
        <UploadTrack
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); fetchMyTracks(); }}
        />
      )}
      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : tracks.length === 0 ? (
        <div className="empty">У вас пока нет треков</div>
      ) : (
        <div className="track-grid">
          {tracks.map((t) => (
            <TrackCard key={t._id} track={t} showStatus />
          ))}
        </div>
      )}
      <style>{`
        .page-title { color: var(--neon-cyan); margin-bottom: 24px; }
        .profile-toolbar { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
        .profile-select {
          padding: 10px 16px;
          border: 1px solid var(--neon-cyan);
          background: rgba(0,0,0,0.3);
          color: var(--text);
          border-radius: 8px;
        }
        .neon-btn {
          padding: 10px 24px;
          border: 2px solid var(--neon-cyan);
          background: transparent;
          color: var(--neon-cyan);
          border-radius: 8px;
          font-weight: 600;
        }
        .neon-btn:hover { background: rgba(5, 217, 232, 0.2); }
        .track-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 20px;
        }
        .loading, .empty { text-align: center; padding: 48px; color: var(--text-dim); }
      `}</style>
    </motion.div>
  );
}
