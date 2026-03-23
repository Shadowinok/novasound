import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import client, { tracks as tracksApi, users as usersApi, playlists as playlistsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TrackCard from '../components/TrackCard';
import UploadTrack from '../components/UploadTrack';

export default function Profile() {
  const navigate = useNavigate();
  const { logout, isAdmin } = useAuth();
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
  const [coverOk, setCoverOk] = useState(false);
  const [coverInfo, setCoverInfo] = useState('');
  const [uploadNotice, setUploadNotice] = useState('');
  const [myPlaylists, setMyPlaylists] = useState([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [playlistFlash, setPlaylistFlash] = useState('');
  const [deletingPlaylistId, setDeletingPlaylistId] = useState('');
  const coverInputRef = useRef(null);
  /** Синхронный id трека для обложки — иначе React state не успевает до onChange файла */
  const pendingCoverTrackIdRef = useRef(null);

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

  const fetchMyPlaylists = () => {
    setPlaylistsLoading(true);
    playlistsApi
      .myList()
      .then((r) => setMyPlaylists(r.data || []))
      .catch(() => setMyPlaylists([]))
      .finally(() => setPlaylistsLoading(false));
  };

  useEffect(() => {
    fetchMyTracks();
    fetchMyReports();
  }, [statusFilter]);

  useEffect(() => {
    fetchMyPlaylists();
  }, []);

  useEffect(() => {
    if (!coverOk) return undefined;
    const t = setTimeout(() => setCoverOk(false), 4000);
    return () => clearTimeout(t);
  }, [coverOk]);

  useEffect(() => {
    if (!uploadNotice) return undefined;
    const t = setTimeout(() => setUploadNotice(''), 14000);
    return () => clearTimeout(t);
  }, [uploadNotice]);

  useEffect(() => {
    if (!playlistFlash) return undefined;
    const t = setTimeout(() => setPlaylistFlash(''), 4000);
    return () => clearTimeout(t);
  }, [playlistFlash]);

  const handleCreatePlaylist = () => {
    if (!newPlaylistTitle.trim()) return;
    playlistsApi
      .createMy({ title: newPlaylistTitle.trim() })
      .then((r) => {
        setMyPlaylists((prev) => [r.data, ...prev]);
        setNewPlaylistTitle('');
        setPlaylistFlash('Плейлист создан');
      })
      .catch((e) => setPlaylistFlash(e.response?.data?.message || 'Не удалось создать плейлист'));
  };

  const handleDeletePlaylist = (plId) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Удалить этот плейлист?')) return;
    setDeletingPlaylistId(plId);
    playlistsApi
      .deleteMy(plId)
      .then(() => {
        setMyPlaylists((prev) => prev.filter((p) => p._id !== plId));
        setPlaylistFlash('Плейлист удалён');
      })
      .catch((e) => setPlaylistFlash(e.response?.data?.message || 'Не удалось удалить'))
      .finally(() => setDeletingPlaylistId(''));
  };

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
    setCoverInfo('');
    setCoverOk(false);
    pendingCoverTrackIdRef.current = trackId;
    setCoverTrackId(trackId);
    if (coverInputRef.current) coverInputRef.current.value = '';
    coverInputRef.current?.click();
  };

  const handleCoverFile = (e) => {
    const file = e.target.files?.[0];
    const trackIdForCover = pendingCoverTrackIdRef.current || coverTrackId;
    if (!file) return;
    if (!trackIdForCover) {
      setCoverError('Сбой выбора трека — нажмите «Сменить обложку» ещё раз');
      return;
    }
    const fd = new FormData();
    fd.append('cover', file);
    setCoverUploading(true);
    setCoverError('');
    setCoverInfo('');
    setCoverOk(false);
    tracksApi.updateCover(trackIdForCover, fd)
      .then((r) => {
        const u = r?.data;
        if (u && u._id) {
          setTracks((prev) =>
            prev.map((t) => (String(t._id) === String(u._id) ? { ...t, ...u } : t))
          );
          window.dispatchEvent(new CustomEvent('novasound_track_cover', { detail: { track: u } }));
        }
        if (u?.coverChangeStatus === 'pending' && u?.coverImagePending) {
          setCoverInfo(
            'Новая обложка на модерации. После одобрения админом появится везде. В каталоге пока старая картинка.'
          );
          setCoverOk(false);
        } else {
          setCoverInfo('');
          setCoverOk(true);
        }
        fetchMyTracks();
      })
      .catch((err) => {
        const d = err.response?.data;
        const msg =
          d?.message
          || d?.errors?.[0]?.msg
          || (Array.isArray(d?.errors) && d.errors[0] && (d.errors[0].msg || d.errors[0].message))
          || err.message
          || 'Не удалось загрузить обложку';
        const code = err.response?.status;
        setCoverError(code ? `${msg} (код ${code})` : msg);
      })
      .finally(() => {
        setCoverUploading(false);
        pendingCoverTrackIdRef.current = null;
        setCoverTrackId('');
        e.target.value = '';
      });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page profile-page">
      <h2 className="page-title">Личный кабинет</h2>
      <input
        ref={coverInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="profile-cover-input"
        onChange={handleCoverFile}
      />
      {coverOk && <div className="profile-cover-ok">Обложка обновлена</div>}
      {uploadNotice && <div className="profile-cover-info">{uploadNotice}</div>}
      {coverInfo && <div className="profile-cover-info">{coverInfo}</div>}
      {coverError && <div className="profile-cover-error">{coverError}</div>}

      <section className="profile-playlists-section" aria-labelledby="profile-playlists-heading">
        <h3 id="profile-playlists-heading" className="section-title">Мои плейлисты</h3>
        <p className="profile-playlists-hint">
          Здесь создаются только <strong>личные</strong> плейлисты. Публичные подборки для главной и каталога создаются в{' '}
          <strong>админ-панели</strong> (раздел «Плейлисты»).
        </p>
        {playlistFlash && <div className="profile-playlist-flash">{playlistFlash}</div>}
        <div className="profile-playlist-create">
          <input
            type="text"
            className="profile-playlist-input"
            placeholder="Название плейлиста"
            value={newPlaylistTitle}
            onChange={(e) => setNewPlaylistTitle(e.target.value)}
          />
          <button type="button" className="neon-btn profile-playlist-create-btn" onClick={handleCreatePlaylist}>
            Создать плейлист
          </button>
        </div>
        {playlistsLoading ? (
          <div className="profile-playlists-loading">Загрузка плейлистов...</div>
        ) : myPlaylists.length === 0 ? (
          <div className="empty profile-playlists-empty">Плейлистов пока нет — создайте выше или через «В плейлист» у трека.</div>
        ) : (
          <ul className="profile-playlist-list">
            {myPlaylists.map((p) => (
              <li key={p._id} className="profile-playlist-row">
                <div className="profile-playlist-main">
                  <Link to={`/playlist/${p._id}`} className="profile-playlist-link">
                    {p.title}
                  </Link>
                  <span className={`profile-playlist-badge ${p.isPublic === false ? 'priv' : 'pub'}`}>
                    {p.isPublic === false ? 'Личный' : p.isPublic === true ? 'Публичный (админ)' : 'В каталоге'}
                  </span>
                  {isAdmin && p.isPublic === true && (
                    <Link to="/admin" className="profile-playlist-admin-link">Редактировать в админке</Link>
                  )}
                </div>
                <div className="profile-playlist-actions">
                  {p.isPublic !== true && (
                  <button
                    type="button"
                    className="profile-pl-delete"
                    disabled={deletingPlaylistId === p._id}
                    onClick={() => handleDeletePlaylist(p._id)}
                  >
                    {deletingPlaylistId === p._id ? '...' : 'Удалить'}
                  </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <h3 className="section-title profile-tracks-heading">Мои треки</h3>
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
              <TrackCard
                key={t._id}
                track={t}
                showStatus
                coverDisplayUrl={t.coverChangeStatus === 'pending' && t.coverImagePending ? t.coverImagePending : undefined}
                showPendingCoverBadge={t.coverChangeStatus === 'pending' && !!t.coverImagePending}
              />
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
          onSuccess={(track) => {
            setShowUpload(false);
            fetchMyTracks();
            if (track?.status === 'approved') {
              setUploadNotice('Трек опубликован в каталоге.');
            } else if (track?.status === 'pending') {
              setUploadNotice(
                `Трек на модерации.${track.moderationComment ? ` ${track.moderationComment}` : ' Администратор проверит публикацию вручную.'}`
              );
            } else {
              setUploadNotice('Трек сохранён.');
            }
          }}
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
              <TrackCard
                track={t}
                showStatus
                coverDisplayUrl={t.coverChangeStatus === 'pending' && t.coverImagePending ? t.coverImagePending : undefined}
                showPendingCoverBadge={t.coverChangeStatus === 'pending' && !!t.coverImagePending}
              />
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
        .profile-tracks-heading { margin-top: 8px; }
        .profile-playlists-section { margin-bottom: 32px; }
        .profile-playlists-hint {
          color: var(--text-dim);
          font-size: 0.9rem;
          max-width: 640px;
          line-height: 1.45;
          margin-bottom: 14px;
        }
        .profile-playlist-flash { color: #69db7c; margin-bottom: 12px; font-size: 0.95rem; }
        .profile-playlist-create {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          margin-bottom: 18px;
        }
        .profile-playlist-input {
          flex: 1;
          min-width: 200px;
          padding: 10px 14px;
          border: 1px solid rgba(5, 217, 232, 0.35);
          border-radius: 10px;
          background: rgba(0,0,0,0.25);
          color: var(--text);
        }
        .profile-playlist-check {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          color: var(--text-dim);
          cursor: pointer;
        }
        .profile-playlist-create-btn { margin-left: auto; }
        .profile-playlists-loading { color: var(--text-dim); margin-bottom: 12px; }
        .profile-playlists-empty { text-align: left; padding: 16px 0; }
        .profile-playlist-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
        .profile-playlist-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          padding: 12px 14px;
          border: 1px solid rgba(5, 217, 232, 0.2);
          border-radius: 12px;
          background: rgba(0,0,0,0.2);
        }
        .profile-playlist-main { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
        .profile-playlist-link { color: var(--neon-cyan); font-weight: 600; text-decoration: none; }
        .profile-playlist-link:hover { text-decoration: underline; }
        .profile-playlist-badge {
          font-size: 0.75rem;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid rgba(255, 200, 0, 0.35);
        }
        .profile-playlist-badge.pub { color: #69db7c; border-color: rgba(0, 255, 100, 0.35); }
        .profile-playlist-badge.priv { color: #ffc800; }
        .profile-playlist-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .profile-playlist-admin-link {
          font-size: 0.8rem;
          color: var(--neon-pink);
          text-decoration: underline;
        }
        .profile-pl-delete {
          padding: 6px 12px;
          font-size: 0.85rem;
          border: 1px solid rgba(255, 80, 80, 0.5);
          background: transparent;
          color: #ff6b6b;
          border-radius: 8px;
        }
        .profile-pl-delete:hover:not(:disabled) { background: rgba(255, 80, 80, 0.08); }
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
        .profile-cover-ok { color: #69db7c; margin-bottom: 12px; }
        .profile-cover-info { color: #ffc800; margin-bottom: 12px; max-width: 560px; line-height: 1.4; }
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
