import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import client from '../api/client';
import { admin as adminApi, playlists as playlistsApi } from '../api/client';
import TrackCard from '../components/TrackCard';

function parseMongoIds(text) {
  if (!text || !String(text).trim()) return [];
  return String(text)
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter((s) => /^[a-f\d]{24}$/i.test(s));
}

export default function Admin() {
  const [pending, setPending] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [users, setUsers] = useState([]);
  const [trackReports, setTrackReports] = useState([]);
  const [tab, setTab] = useState('moderation');
  const [comment, setComment] = useState('');
  const [userReason, setUserReason] = useState('Нарушение правил сервиса');
  const [deletingUserId, setDeletingUserId] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [adminReportMessage, setAdminReportMessage] = useState('');
  const [resolvingReportId, setResolvingReportId] = useState('');
  const [adminComments, setAdminComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [pendingCovers, setPendingCovers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [plTitle, setPlTitle] = useState('');
  const [plDescription, setPlDescription] = useState('');
  const [plTracksText, setPlTracksText] = useState('');
  const [plCoverFile, setPlCoverFile] = useState(null);
  const [plCoverInputKey, setPlCoverInputKey] = useState(0);
  const [plEditingId, setPlEditingId] = useState(null);
  const [plSaving, setPlSaving] = useState(false);
  const [plFormOk, setPlFormOk] = useState('');
  const [plFormErr, setPlFormErr] = useState('');

  const fetchPending = () => {
    adminApi.pendingTracks().then((r) => setPending(r.data || [])).catch(() => setPending([]));
  };
  const fetchPlaylists = () => {
    adminApi.playlists().then((r) => setPlaylists(r.data || [])).catch(() => setPlaylists([]));
  };
  const fetchUsers = () => {
    adminApi.users().then((r) => setUsers(r.data || [])).catch(() => setUsers([]));
  };

  const fetchTrackReports = () => {
    adminApi.trackReports('open')
      .then((r) => setTrackReports(r.data || []))
      .catch(() => setTrackReports([]));
  };

  useEffect(() => {
    setLoading(true);
    if (tab === 'moderation') {
      adminApi.pendingTracks().then((r) => setPending(r.data || [])).catch(() => setPending([])).finally(() => setLoading(false));
    } else if (tab === 'covers') {
      adminApi.coverPending()
        .then((r) => setPendingCovers(r.data || []))
        .catch(() => setPendingCovers([]))
        .finally(() => setLoading(false));
    } else if (tab === 'playlists') {
      adminApi.playlists().then((r) => setPlaylists(r.data || [])).catch(() => setPlaylists([])).finally(() => setLoading(false));
    } else if (tab === 'reports') {
      adminApi.trackReports('open')
        .then((r) => setTrackReports(r.data || []))
        .catch(() => setTrackReports([]))
        .finally(() => setLoading(false));
    } else {
      adminApi.users().then((r) => setUsers(r.data || [])).catch(() => setUsers([])).finally(() => setLoading(false));
    }
  }, [tab]);

  const handleApprove = (id) => {
    adminApi.approveTrack(id, comment).then(() => {
      setComment('');
      fetchPending();
    }).catch(() => {});
  };
  const handleReject = (id) => {
    adminApi.rejectTrack(id, comment).then(() => {
      setComment('');
      fetchPending();
    }).catch(() => {});
  };

  const handleApproveCover = (id) => {
    adminApi.approveCover(id).then(() => {
      setAdminMessage('Обложка опубликована');
      adminApi.coverPending().then((r) => setPendingCovers(r.data || [])).catch(() => {});
    }).catch((e) => setAdminMessage(e.response?.data?.message || 'Ошибка'));
  };

  const handleRejectCoverModeration = (id) => {
    if (!window.confirm('Отклонить новую обложку? Останется старая.')) return;
    adminApi.rejectCoverModeration(id, comment).then(() => {
      setComment('');
      setAdminMessage('Обложка отклонена');
      adminApi.coverPending().then((r) => setPendingCovers(r.data || [])).catch(() => {});
    }).catch((e) => setAdminMessage(e.response?.data?.message || 'Ошибка'));
  };
  const handleDeleteUser = (id) => {
    if (!id) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm('Удалить аккаунт пользователя без возможности восстановления?')) return;
    setDeletingUserId(id);
    setAdminMessage('');
    adminApi.deleteUser(id, userReason)
      .then((r) => {
        setAdminMessage(r.data?.message || 'Пользователь удалён');
        fetchUsers();
      })
      .catch((e) => setAdminMessage(e.response?.data?.message || 'Ошибка удаления пользователя'))
      .finally(() => setDeletingUserId(''));
  };

  const resetPlaylistForm = (clearMessages = true) => {
    setPlTitle('');
    setPlDescription('');
    setPlTracksText('');
    setPlCoverFile(null);
    setPlCoverInputKey((k) => k + 1);
    setPlEditingId(null);
    if (clearMessages) {
      setPlFormOk('');
      setPlFormErr('');
    }
  };

  const startEditPlaylist = (p) => {
    setPlFormOk('');
    setPlFormErr('');
    setPlEditingId(p._id);
    setPlTitle(p.title || '');
    setPlDescription(p.description || '');
    const ids = (p.tracks || []).map((t) => (typeof t === 'object' && t?._id ? t._id : t)).filter(Boolean);
    setPlTracksText(ids.join(', '));
    setPlCoverFile(null);
    setPlCoverInputKey((k) => k + 1);
  };

  const handlePlaylistSubmit = (e) => {
    e.preventDefault();
    setPlFormOk('');
    setPlFormErr('');
    const title = plTitle.trim();
    if (!title) {
      setPlFormErr('Укажите название плейлиста');
      return;
    }
    const ids = parseMongoIds(plTracksText);
    const fd = new FormData();
    fd.append('title', title);
    fd.append('description', plDescription.trim());
    fd.append('tracks', JSON.stringify(ids));
    if (plCoverFile) fd.append('cover', plCoverFile);

    setPlSaving(true);
    const wasEdit = !!plEditingId;
    const req = plEditingId
      ? playlistsApi.update(plEditingId, fd)
      : playlistsApi.create(fd);
    req
      .then(() => {
        resetPlaylistForm(false);
        setPlFormErr('');
        setPlFormOk(wasEdit ? 'Плейлист сохранён' : 'Плейлист создан');
        fetchPlaylists();
      })
      .catch((err) => {
        const m =
          err.response?.data?.message
          || err.response?.data?.errors?.[0]?.msg
          || err.message
          || 'Ошибка сохранения';
        setPlFormErr(m);
      })
      .finally(() => setPlSaving(false));
  };

  const handleDeletePlaylist = (id, title) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Удалить плейлист «${title}»? Это действие необратимо.`)) return;
    setPlSaving(true);
    setPlFormOk('');
    setPlFormErr('');
    playlistsApi
      .delete(id)
      .then(() => {
        setPlFormOk('Плейлист удалён');
        setPlFormErr('');
        if (plEditingId === id) resetPlaylistForm(false);
        fetchPlaylists();
      })
      .catch((err) => setPlFormErr(err.response?.data?.message || 'Не удалось удалить'))
      .finally(() => setPlSaving(false));
  };

  const handleResolveReport = (reportId, action) => {
    if (!reportId) return;
    setResolvingReportId(reportId);
    setAdminReportMessage('');
    const adminComment = adminComments[reportId] || '';
    adminApi.resolveTrackReport(reportId, action, adminComment)
      .then((r) => {
        setAdminReportMessage(r.data?.message || 'Жалоба обработана');
        fetchTrackReports();
      })
      .catch((e) => setAdminReportMessage(e.response?.data?.message || 'Ошибка обработки жалобы'))
      .finally(() => setResolvingReportId(''));
  };

  const filteredUsers = useMemo(() => {
    const list = Array.isArray(users) ? users : [];
    const q = userSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u) => {
      const name = String(u.username || '').toLowerCase();
      const mail = String(u.email || '').toLowerCase();
      return name.includes(q) || mail.includes(q);
    });
  }, [users, userSearch]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page admin-page">
      <h2 className="page-title">Админ-панель</h2>
      <div className="admin-tabs">
        <button type="button" className={tab === 'moderation' ? 'active' : ''} onClick={() => setTab('moderation')}>Модерация треков</button>
        <button type="button" className={tab === 'covers' ? 'active' : ''} onClick={() => setTab('covers')}>Обложки</button>
        <button type="button" className={tab === 'playlists' ? 'active' : ''} onClick={() => setTab('playlists')}>Плейлисты</button>
        <button type="button" className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>Пользователи</button>
        <button type="button" className={tab === 'reports' ? 'active' : ''} onClick={() => setTab('reports')}>Жалобы на треки</button>
      </div>
      {tab === 'covers' && (
        <>
          <p className="admin-hint">Обложки с подозрительным именем файла (эвристика) — на ручную проверку.</p>
          {adminMessage && <div className="admin-message">{adminMessage}</div>}
          <input
            type="text"
            placeholder="Комментарий при отклонении обложки (опционально)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="admin-comment-input"
          />
          {loading ? (
            <div className="loading">Загрузка...</div>
          ) : pendingCovers.length === 0 ? (
            <div className="empty">Нет обложек на модерации</div>
          ) : (
            <div className="admin-pending-grid">
              {pendingCovers.map((track) => (
                <motion.div key={track._id} className="admin-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <TrackCard track={track} showStatus coverDisplayUrl={track.coverImagePending || track.coverImage} />
                  <div className="admin-card-actions">
                    <button type="button" className="admin-btn approve" onClick={() => handleApproveCover(track._id)}>Одобрить обложку</button>
                    <button type="button" className="admin-btn reject" onClick={() => handleRejectCoverModeration(track._id)}>Отклонить</button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
      {tab === 'moderation' && (
        <>
          <p className="admin-hint">Одобрите или отклоните треки. Можно добавить комментарий.</p>
          <input
            type="text"
            placeholder="Комментарий модератора (опционально)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="admin-comment-input"
          />
          {loading ? (
            <div className="loading">Загрузка...</div>
          ) : pending.length === 0 ? (
            <div className="empty">Нет треков на модерации</div>
          ) : (
            <div className="admin-pending-grid">
              {pending.map((track) => (
                <motion.div key={track._id} className="admin-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <TrackCard
                    track={track}
                    showStatus
                    coverDisplayUrl={track.coverImagePending || track.coverImage}
                  />
                  <div className="admin-card-actions">
                    <button type="button" className="admin-btn approve" onClick={() => handleApprove(track._id)}>Одобрить</button>
                    <button type="button" className="admin-btn reject" onClick={() => handleReject(track._id)}>Отклонить</button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
      {tab === 'playlists' && (
        <div className="admin-playlists">
          <p className="admin-hint">
            Публичные подборки для главной и каталога. Обложка — jpg, png, webp (до 5 МБ). ID треков — через запятую или с новой строки (одобренные треки).
          </p>
          {plFormOk && <div className="admin-message">{plFormOk}</div>}
          {plFormErr && <div className="admin-pl-error">{plFormErr}</div>}
          <form className="admin-playlist-form" onSubmit={handlePlaylistSubmit}>
            <h3 className="admin-playlist-form-title">{plEditingId ? 'Редактировать плейлист' : 'Новый плейлист'}</h3>
            <label className="admin-pl-label">
              Название *
              <input
                type="text"
                className="admin-comment-input admin-pl-field"
                value={plTitle}
                onChange={(e) => setPlTitle(e.target.value)}
                placeholder="Название"
                maxLength={100}
                required
              />
            </label>
            <label className="admin-pl-label">
              Описание
              <textarea
                className="admin-comment-input admin-pl-textarea"
                value={plDescription}
                onChange={(e) => setPlDescription(e.target.value)}
                placeholder="Краткое описание (опционально)"
                rows={3}
                maxLength={1000}
              />
            </label>
            <label className="admin-pl-label">
              Обложка {plEditingId ? '(новый файл заменит текущую)' : '(опционально)'}
              <input
                key={plCoverInputKey}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                className="admin-pl-file"
                onChange={(e) => setPlCoverFile(e.target.files?.[0] || null)}
              />
            </label>
            <label className="admin-pl-label">
              ID треков (MongoDB ObjectId)
              <textarea
                className="admin-comment-input admin-pl-textarea"
                value={plTracksText}
                onChange={(e) => setPlTracksText(e.target.value)}
                placeholder="507f1f77bcf86cd799439011, 507f191e810c19729de860ea"
                rows={4}
              />
            </label>
            <div className="admin-pl-form-actions">
              <button type="submit" className="admin-btn admin-pl-submit" disabled={plSaving}>
                {plSaving ? 'Сохранение...' : plEditingId ? 'Сохранить' : 'Создать плейлист'}
              </button>
              {plEditingId && (
                <button type="button" className="admin-btn admin-pl-cancel" onClick={() => resetPlaylistForm()}>
                  Отмена
                </button>
              )}
            </div>
          </form>
          {loading ? (
            <div className="loading">Загрузка...</div>
          ) : playlists.length === 0 ? (
            <div className="empty">Плейлистов пока нет</div>
          ) : (
            <div className="admin-playlist-grid">
              {playlists.map((p) => (
                <div key={p._id} className="admin-playlist-card">
                  <div
                    className="admin-playlist-card-cover"
                    style={{
                      backgroundImage: p.coverImage
                        ? `url(${p.coverImage})`
                        : 'linear-gradient(135deg, var(--neon-purple), var(--neon-pink))'
                    }}
                  />
                  <div className="admin-playlist-card-body">
                    <div className="admin-playlist-card-title">{p.title}</div>
                    <div className="admin-playlist-card-meta">
                      Треков: {Array.isArray(p.tracks) ? p.tracks.length : 0}
                      {p.isPublic === false && <span className="admin-pl-badge priv">Личный</span>}
                      {p.isPublic !== false && <span className="admin-pl-badge pub">В каталоге</span>}
                    </div>
                    <div className="admin-playlist-card-actions">
                      <Link to={`/playlist/${p._id}`} className="admin-pl-link" target="_blank" rel="noreferrer">
                        Открыть
                      </Link>
                      <button type="button" className="admin-btn admin-pl-edit" onClick={() => startEditPlaylist(p)}>
                        Редактировать
                      </button>
                      <button
                        type="button"
                        className="admin-btn reject"
                        onClick={() => handleDeletePlaylist(p._id, p.title)}
                        disabled={plSaving}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {tab === 'users' && (
        <div className="admin-users">
          <p className="admin-hint">Удаление аккаунтов пользователей администратором.</p>
          <input
            type="search"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="admin-comment-input admin-user-search"
            placeholder="Поиск по имени или email…"
            autoComplete="off"
            aria-label="Поиск пользователя"
          />
          <input
            type="text"
            value={userReason}
            onChange={(e) => setUserReason(e.target.value)}
            className="admin-comment-input"
            placeholder="Причина удаления (уйдёт в письмо пользователю)"
          />
          {adminMessage && <div className="admin-message">{adminMessage}</div>}
          {loading ? (
            <div className="loading">Загрузка...</div>
          ) : users.length === 0 ? (
            <div className="empty">Пользователей пока нет</div>
          ) : filteredUsers.length === 0 ? (
            <div className="empty">Никого не найдено по запросу «{userSearch.trim()}»</div>
          ) : (
            <div className="users-table-wrap">
              <p className="admin-user-count">
                {userSearch.trim()
                  ? `Найдено: ${filteredUsers.length} из ${users.length}`
                  : `Всего: ${users.length}`}
              </p>
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Пользователь</th>
                    <th>Email</th>
                    <th>Роль</th>
                    <th>Статус</th>
                    <th>Создан</th>
                    <th>Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u._id}>
                      <td>{u.username}</td>
                      <td>{u.email}</td>
                      <td>{u.role}</td>
                      <td>{u.isBlocked ? 'Заблокирован' : 'Активен'}</td>
                      <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-btn reject"
                          disabled={deletingUserId === u._id}
                          onClick={() => handleDeleteUser(u._id)}
                        >
                          {deletingUserId === u._id ? 'Удаляем...' : 'Удалить'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {tab === 'reports' && (
        <div className="admin-reports">
          <p className="admin-hint">Жалобы от пользователей. Трек не скрывается сразу — решение принимает админ.</p>
          {adminReportMessage && <div className="admin-message">{adminReportMessage}</div>}
          {loading ? (
            <div className="loading">Загрузка...</div>
          ) : trackReports.length === 0 ? (
            <div className="empty">Жалоб пока нет</div>
          ) : (
            <div className="reports-table-wrap">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Тип</th>
                    <th>Трек</th>
                    <th>Автор</th>
                    <th>Жалобщик</th>
                    <th>Текст жалобы</th>
                    <th>Комментарий админа</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {trackReports.map((rep) => (
                    <tr key={rep._id}>
                      <td>{rep.reportType === 'cover' ? 'Обложка' : 'Контент'}</td>
                      <td>{rep.track?.title || '-'}</td>
                      <td>{rep.track?.author?.username || '-'}</td>
                      <td>{rep.reporter?.username || '-'}</td>
                      <td className="rep-text">
                        {rep.text}
                        <div className="rep-ai">AI: {rep.aiSuggestedAction || '-'}</div>
                        <div className="rep-ai">Попытка: {rep.attemptNumber || 1}/4</div>
                        <div className="rep-ai">Уникальных жалобщиков: {rep.uniqueReporters || 1}</div>
                      </td>
                      <td>
                        <textarea
                          className="rep-admin-comment"
                          rows={3}
                          value={adminComments[rep._id] || ''}
                          onChange={(e) => setAdminComments((prev) => ({ ...prev, [rep._id]: e.target.value }))}
                          placeholder="Опишите решение админа"
                        />
                      </td>
                      <td>
                        <div className="rep-actions">
                          <button
                            type="button"
                            className="admin-btn approve"
                            disabled={resolvingReportId === rep._id}
                            onClick={() => handleResolveReport(rep._id, 'leave')}
                          >
                            {resolvingReportId === rep._id ? '...' : 'Оставить'}
                          </button>
                          <button
                            type="button"
                            className="admin-btn reject"
                            disabled={resolvingReportId === rep._id}
                            onClick={() => handleResolveReport(rep._id, 'rejectTrack')}
                          >
                            {resolvingReportId === rep._id ? '...' : 'Отклонить трек'}
                          </button>
                          {rep.reportType === 'cover' && (
                            <button
                              type="button"
                              className="admin-btn reject"
                              disabled={resolvingReportId === rep._id}
                              onClick={() => handleResolveReport(rep._id, 'rejectCover')}
                            >
                              {resolvingReportId === rep._id ? '...' : 'Снять обложку'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <style>{`
        .page-title { color: var(--neon-cyan); margin-bottom: 24px; }
        .admin-page {
          max-width: 1100px;
          margin: 0 auto;
          padding-left: 280px;
          padding-right: 24px;
        }
        .admin-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
        .admin-tabs button {
          padding: 10px 20px;
          border: 1px solid var(--neon-purple);
          background: transparent;
          color: var(--text);
          border-radius: 8px;
        }
        .admin-tabs button.active {
          background: rgba(211, 0, 197, 0.3);
          border-color: var(--neon-pink);
          color: var(--neon-pink);
        }
        .admin-hint { color: var(--text-dim); margin-bottom: 12px; font-size: 0.9rem; }
        .admin-comment-input {
          width: 100%;
          max-width: 400px;
          padding: 10px 14px;
          margin-bottom: 20px;
          border: 1px solid rgba(5, 217, 232, 0.4);
          border-radius: 8px;
          background: rgba(0,0,0,0.3);
          color: var(--text);
        }
        .admin-user-search { margin-bottom: 12px; max-width: 420px; }
        .admin-user-count { font-size: 0.85rem; color: var(--text-dim); margin: 0 0 10px 0; }
        .admin-pending-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 20px;
        }
        .admin-card {
          background: var(--bg-card);
          border-radius: 12px;
          padding: 12px;
          border: 1px solid rgba(255, 42, 109, 0.3);
        }
        .admin-card-actions { display: flex; gap: 8px; margin-top: 12px; }
        .admin-btn {
          flex: 1;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 0.85rem;
          border: none;
        }
        .admin-btn.approve { background: rgba(0, 255, 100, 0.3); color: #00ff64; }
        .admin-btn.reject { background: rgba(255, 50, 50, 0.3); color: #ff3232; }
        .admin-playlists { margin-top: 8px; }
        .admin-playlist-form {
          max-width: 520px;
          padding: 18px;
          margin-bottom: 28px;
          border: 1px solid rgba(5, 217, 232, 0.25);
          border-radius: 12px;
          background: rgba(0,0,0,0.2);
        }
        .admin-playlist-form-title {
          margin: 0 0 14px;
          font-size: 1.05rem;
          color: var(--neon-cyan);
        }
        .admin-pl-label {
          display: block;
          margin-bottom: 12px;
          font-size: 0.85rem;
          color: var(--text-dim);
        }
        .admin-pl-field { margin-bottom: 0 !important; max-width: none !important; width: 100%; }
        .admin-pl-textarea {
          width: 100%;
          max-width: none;
          min-height: 72px;
          padding: 10px 14px;
          margin-bottom: 0;
          border: 1px solid rgba(5, 217, 232, 0.4);
          border-radius: 8px;
          background: rgba(0,0,0,0.3);
          color: var(--text);
          font-family: inherit;
          resize: vertical;
        }
        .admin-pl-file {
          margin-top: 6px;
          font-size: 0.85rem;
          color: var(--text);
        }
        .admin-pl-form-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 8px;
        }
        .admin-pl-submit {
          background: rgba(5, 217, 232, 0.25) !important;
          color: var(--neon-cyan) !important;
          flex: 0 1 auto;
          padding: 10px 18px !important;
        }
        .admin-pl-cancel {
          background: transparent !important;
          border: 1px solid var(--text-dim) !important;
          color: var(--text-dim) !important;
        }
        .admin-pl-error {
          margin-bottom: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          background: rgba(255, 50, 50, 0.12);
          border: 1px solid rgba(255, 80, 80, 0.35);
          color: #ff6b6b;
          font-size: 0.9rem;
        }
        .admin-playlist-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }
        .admin-playlist-card {
          display: flex;
          gap: 12px;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(211, 0, 197, 0.25);
          background: rgba(0,0,0,0.18);
          align-items: flex-start;
        }
        .admin-playlist-card-cover {
          width: 88px;
          height: 88px;
          flex-shrink: 0;
          border-radius: 10px;
          background-size: cover;
          background-position: center;
          border: 1px solid rgba(5, 217, 232, 0.2);
        }
        .admin-playlist-card-body { flex: 1; min-width: 0; }
        .admin-playlist-card-title {
          font-weight: 600;
          color: var(--neon-cyan);
          margin-bottom: 6px;
          font-size: 0.95rem;
          line-height: 1.3;
        }
        .admin-playlist-card-meta {
          font-size: 0.8rem;
          color: var(--text-dim);
          margin-bottom: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
        }
        .admin-pl-badge {
          font-size: 0.75rem;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid rgba(255, 200, 0, 0.35);
        }
        .admin-pl-badge.pub { color: #69db7c; border-color: rgba(0, 255, 100, 0.35); }
        .admin-pl-badge.priv { color: #ffc800; }
        .admin-playlist-card-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .admin-pl-link {
          font-size: 0.85rem;
          color: var(--neon-pink);
          text-decoration: underline;
        }
        .admin-pl-edit {
          background: rgba(120, 120, 255, 0.2) !important;
          color: #b9b9ff !important;
          flex: 0 1 auto;
        }
        .admin-message {
          margin-bottom: 12px;
          color: var(--neon-cyan);
          font-size: 0.9rem;
        }
        .users-table-wrap {
          overflow-x: auto;
          border: 1px solid rgba(5, 217, 232, 0.2);
          border-radius: 10px;
        }
        .users-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 760px;
        }
        .users-table th,
        .users-table td {
          padding: 10px 12px;
          border-bottom: 1px solid rgba(5, 217, 232, 0.12);
          text-align: left;
          font-size: 0.9rem;
        }
        .users-table th {
          color: var(--neon-cyan);
          font-weight: 600;
        }
        .loading, .empty { padding: 24px; color: var(--text-dim); }

        .reports-table-wrap {
          overflow-x: auto;
          border: 1px solid rgba(5, 217, 232, 0.2);
          border-radius: 10px;
          margin-top: 12px;
        }
        .reports-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 980px;
        }
        .reports-table th,
        .reports-table td {
          padding: 10px 12px;
          border-bottom: 1px solid rgba(5, 217, 232, 0.12);
          text-align: left;
          font-size: 0.9rem;
          vertical-align: top;
        }
        .reports-table th {
          color: var(--neon-cyan);
          font-weight: 600;
        }
        .rep-text { max-width: 320px; }
        .rep-ai { margin-top: 6px; color: var(--text-dim); font-size: 0.8rem; }
        .rep-admin-comment {
          width: 260px;
          background: rgba(0,0,0,0.25);
          border: 1px solid rgba(5, 217, 232, 0.35);
          border-radius: 10px;
          padding: 8px 10px;
          color: var(--text);
          resize: vertical;
        }
        .rep-actions { display: flex; flex-direction: column; gap: 8px; }
        @media (max-width: 900px) {
          .admin-page { padding-left: 0; padding-right: 0; }
        }
      `}</style>
    </motion.div>
  );
}
