import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import client, { tracks as tracksApi, users as usersApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TrackCard from '../components/TrackCard';
import UploadTrack from '../components/UploadTrack';

export default function Profile() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [tracks, setTracks] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDanger, setShowDanger] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [dangerError, setDangerError] = useState('');
  const [dangerLoading, setDangerLoading] = useState(false);
  const [deleteTrackId, setDeleteTrackId] = useState('');
  const [deleteTrackLoading, setDeleteTrackLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [coverTrackId, setCoverTrackId] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState('');
  const coverInputRef = useRef(null);

  const fetchMyTracks = () => {
    setLoading(true);
    client.get('/tracks/my', { params: statusFilter ? { status: statusFilter } : {} })
      .then((r) => setTracks(r.data || []))
      .catch(() => setTracks([]))
      .finally(() => setLoading(false));
  };

  const fetchMyReports = () => {
    tracksApi.myReports()
      .then((r) => setReports(r.data || []))
      .catch(() => setReports([]));
  };

  useEffect(() => {
    fetchMyTracks();
    fetchMyReports();
  }, [statusFilter]);

  const stats = useMemo(() => {
    const list = Array.isArray(tracks) ? tracks : [];
    const totalTracks = list.length;
    const totalPlays = list.reduce((sum, t) => sum + (Number(t.plays) || 0), 0);
    const totalLikes = list.reduce((sum, t) => {
      const l = t?.likes;
      if (typeof l === 'number') return sum + l;
      if (Array.isArray(l)) return sum + l.length;
      return sum;
    }, 0);
    const byStatus = list.reduce((acc, t) => {
      const s = t?.status || 'unknown';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    const top = [...list].sort((a, b) => (Number(b.plays) || 0) - (Number(a.plays) || 0)).slice(0, 3);
    return { totalTracks, totalPlays, totalLikes, byStatus, top };
  }, [tracks]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleDeleteAccount = () => {
    setDangerError('');
    if (!deletePassword) return setDangerError('Введите пароль');
    if (deleteConfirm.trim().toLowerCase() !== 'delete') return setDangerError('Введите DELETE для подтверждения');
    setDangerLoading(true);
    usersApi.deleteMe(deletePassword)
      .then(() => {
        logout();
        navigate('/');
      })
      .catch((e) => setDangerError(e.response?.data?.message || 'Не удалось удалить аккаунт'))
      .finally(() => setDangerLoading(false));
  };

  const handleDeleteTrack = (id) => {
    if (!id) return;
    setDeleteTrackId(id);
    setDeleteTrackLoading(true);
    tracksApi.delete(id)
      .then(() => fetchMyTracks())
      .catch(() => {})
      .finally(() => {
        setDeleteTrackLoading(false);
        setDeleteTrackId('');
      });
  };

  const openCoverPicker = (trackId) => {
    setCoverError('');
    setCoverTrackId(trackId);
    if (coverInputRef.current) coverInputRef.current.value = '';
    coverInputRef.current?.click();
  };

  const handleCoverFile = (e) => {
    const file = e.target.files?.[0];
    if (!file || !coverTrackId) return;
    const fd = new FormData();
    fd.append('cover', file);
    setCoverUploading(true);
    setCoverError('');
    tracksApi.updateCover(coverTrackId, fd)
      .then(() => fetchMyTracks())
      .catch((err) => setCoverError(err.response?.data?.message || 'Не удалось загрузить обложку'))
      .finally(() => {
        setCoverUploading(false);
        setCoverTrackId('');
        e.target.value = '';
      });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page profile-page">
      <h2 className="page-title">Мои треки</h2>
      <input
        ref={coverInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="profile-cover-input"
        onChange={handleCoverFile}
      />
      {coverError && <div className="profile-cover-error">{coverError}</div>}
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
        <button type="button" className="danger-btn" onClick={() => { setShowDanger(true); setDangerError(''); }}>Удалить аккаунт</button>
        <button type="button" className="logout-btn" onClick={handleLogout}>Выйти</button>
      </div>
      <div className="profile-stats">
        <div className="stat-card">
          <div className="stat-label">Треков</div>
          <div className="stat-value">{stats.totalTracks}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Прослушиваний</div>
          <div className="stat-value">{stats.totalPlays}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Лайков</div>
          <div className="stat-value">{stats.totalLikes}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Статусы</div>
          <div className="stat-meta">
            <span>pending: {stats.byStatus.pending || 0}</span>
            <span>approved: {stats.byStatus.approved || 0}</span>
            <span>rejected: {stats.byStatus.rejected || 0}</span>
          </div>
        </div>
      </div>
      {stats.top.length > 0 && (
        <div className="profile-top">
          <h3 className="section-title">Топ по прослушиваниям</h3>
          <div className="track-grid">
            {stats.top.map((t) => (
              <TrackCard key={t._id} track={t} showStatus />
            ))}
          </div>
        </div>
      )}
      <div className="profile-reports">
        <h3 className="section-title">Мои жалобы</h3>
        {reports.length === 0 ? (
          <div className="empty">Жалоб пока нет</div>
        ) : (
          <div className="reports-list">
            {reports.map((r) => (
              <div key={r._id} className="report-item">
                <div className="report-head">
                  <b>{r.track?.title || 'Удалённый трек'}</b>
                  <span className={`report-status status-${r.status}`}>{r.status === 'open' ? 'Открыта' : 'Обработана'}</span>
                </div>
                <div className="report-body">{r.text}</div>
                {r.moderationComment && <div className="report-admin-comment">Ответ модератора: {r.moderationComment}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
      {showUpload && (
        <UploadTrack
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); fetchMyTracks(); }}
        />
      )}
      {showDanger && (
        <motion.div className="danger-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowDanger(false)}>
          <motion.div className="danger-modal" initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="danger-title">Удалить аккаунт</h3>
            <p className="danger-text">
              Это действие необратимо. Для подтверждения введите слово <b>DELETE</b> и ваш пароль.
            </p>
            <input
              type="text"
              placeholder="Введите DELETE"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="danger-input"
            />
            <input
              type="password"
              placeholder="Пароль"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="danger-input"
            />
            {dangerError && <div className="danger-error">{dangerError}</div>}
            <div className="danger-actions">
              <button type="button" className="danger-cancel" onClick={() => setShowDanger(false)}>Отмена</button>
              <button type="button" disabled={dangerLoading} className="danger-confirm" onClick={handleDeleteAccount}>
                {dangerLoading ? 'Удаляем...' : 'Удалить'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : tracks.length === 0 ? (
        <div className="empty">У вас пока нет треков</div>
      ) : (
        <div className="track-grid">
          {tracks.map((t) => (
            <div key={t._id} className="my-track">
              <TrackCard track={t} showStatus />
              <div className="my-track-actions">
                {t.status === 'approved' && (
                  <button
                    type="button"
                    className="my-track-cover"
                    disabled={coverUploading}
                    onClick={() => openCoverPicker(t._id)}
                  >
                    {coverUploading && coverTrackId === t._id ? 'Загрузка...' : 'Сменить обложку'}
                  </button>
                )}
                <button
                  type="button"
                  className="my-track-delete"
                  disabled={deleteTrackLoading && deleteTrackId === t._id}
                  onClick={() => {
                    // eslint-disable-next-line no-alert
                    if (window.confirm('Удалить трек? Это действие необратимо.')) handleDeleteTrack(t._id);
                  }}
                >
                  {deleteTrackLoading && deleteTrackId === t._id ? 'Удаляем...' : 'Удалить'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`
        .page-title { color: var(--neon-cyan); margin-bottom: 24px; }
        .profile-page {
          max-width: 1100px;
          margin: 0 auto;
          padding-left: 280px;
          padding-right: 24px;
        }
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
        .profile-cover-input { position: absolute; width: 0; height: 0; opacity: 0; pointer-events: none; }
        .profile-cover-error { color: #ff6b6b; margin-bottom: 12px; }
        .logout-btn {
          appearance: none;
          -webkit-appearance: none;
          border: 1px solid rgba(255, 42, 109, 0.8);
          background: rgba(0, 0, 0, 0.25);
          color: var(--neon-pink);
          padding: 10px 16px;
          border-radius: 10px;
          line-height: 1;
        }
        .logout-btn:hover {
          text-shadow: var(--glow-pink);
          box-shadow: 0 0 18px rgba(255, 42, 109, 0.25);
        }
        .danger-btn {
          padding: 10px 16px;
          border: 1px solid rgba(255, 50, 50, 0.7);
          background: rgba(0,0,0,0.25);
          color: #ff3232;
          border-radius: 10px;
        }
        .danger-btn:hover { box-shadow: 0 0 18px rgba(255, 50, 50, 0.2); }
        .profile-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
          margin-bottom: 28px;
        }
        .stat-card {
          background: var(--bg-card);
          border: 1px solid rgba(5, 217, 232, 0.2);
          border-radius: 14px;
          padding: 14px 16px;
        }
        .stat-label { color: var(--text-dim); font-size: 0.85rem; margin-bottom: 6px; }
        .stat-value { color: var(--neon-cyan); font-family: var(--font-display); font-size: 1.4rem; }
        .profile-reports { margin: 26px 0; }
        .reports-list { display: flex; flex-direction: column; gap: 12px; }
        .report-item {
          border: 1px solid rgba(5, 217, 232, 0.2);
          background: rgba(0,0,0,0.22);
          border-radius: 12px;
          padding: 12px;
        }
        .report-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 6px;
        }
        .report-status {
          font-size: 0.8rem;
          border-radius: 999px;
          padding: 2px 8px;
          border: 1px solid rgba(5, 217, 232, 0.35);
        }
        .report-status.status-open { color: #ffc800; border-color: rgba(255, 200, 0, 0.4); }
        .report-status.status-resolved { color: #00ff64; border-color: rgba(0, 255, 100, 0.35); }
        .report-body { color: var(--text); margin-bottom: 6px; }
        .report-admin-comment { color: var(--neon-cyan); font-size: 0.9rem; }
        .stat-meta { display: flex; flex-direction: column; gap: 6px; color: var(--text); font-size: 0.9rem; }
        .profile-top { margin-bottom: 24px; }
        .track-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 20px;
        }
        .my-track { display: flex; flex-direction: column; gap: 10px; }
        .my-track-actions { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; align-items: center; }
        .my-track-cover {
          padding: 8px 14px;
          border: 1px solid rgba(5, 217, 232, 0.6);
          background: rgba(0,0,0,0.25);
          color: var(--neon-cyan);
          border-radius: 8px;
          font-size: 0.9rem;
        }
        .my-track-cover:hover:not(:disabled) { background: rgba(5, 217, 232, 0.12); }
        .my-track-cover:disabled { opacity: 0.6; }
        .my-track-delete {
          padding: 8px 12px;
          border: 1px solid rgba(255, 50, 50, 0.7);
          background: rgba(0,0,0,0.25);
          color: #ff3232;
          border-radius: 10px;
          font-weight: 700;
        }
        .my-track-delete:disabled { opacity: 0.6; cursor: not-allowed; }
        .loading, .empty { text-align: center; padding: 48px; color: var(--text-dim); }
        .danger-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.82);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 300;
          padding: 24px;
        }
        .danger-modal {
          width: 100%;
          max-width: 420px;
          background: var(--bg-card);
          border: 1px solid rgba(255, 50, 50, 0.35);
          border-radius: 16px;
          padding: 22px;
          box-shadow: 0 0 50px rgba(255, 50, 50, 0.12);
        }
        .danger-title { color: #ff3232; margin-bottom: 10px; }
        .danger-text { color: var(--text-dim); margin-bottom: 14px; font-size: 0.95rem; }
        .danger-input {
          width: 100%;
          padding: 10px 14px;
          margin-bottom: 10px;
          border: 1px solid rgba(255, 50, 50, 0.35);
          border-radius: 10px;
          background: rgba(0,0,0,0.25);
          color: var(--text);
        }
        .danger-error { color: #ff6b6b; margin-top: 6px; margin-bottom: 10px; font-size: 0.9rem; }
        .danger-actions { display: flex; gap: 10px; margin-top: 14px; }
        .danger-cancel {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid var(--text-dim);
          background: transparent;
          color: var(--text-dim);
          border-radius: 10px;
        }
        .danger-confirm {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid rgba(255, 50, 50, 0.75);
          background: rgba(255, 50, 50, 0.18);
          color: #ff3232;
          border-radius: 10px;
          font-weight: 700;
        }
        @media (max-width: 900px) {
          .profile-page { padding-left: 0; padding-right: 0; }
        }
      `}</style>
    </motion.div>
  );
}
