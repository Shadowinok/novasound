import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import client from '../api/client';
import { admin as adminApi } from '../api/client';
import UploadTrack from '../components/UploadTrack';
import TrackCard from '../components/TrackCard';

export default function Admin() {
  const [pending, setPending] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('moderation');
  const [comment, setComment] = useState('');
  const [userReason, setUserReason] = useState('Нарушение правил сервиса');
  const [deletingUserId, setDeletingUserId] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPending = () => {
    adminApi.pendingTracks().then((r) => setPending(r.data || [])).catch(() => setPending([]));
  };
  const fetchPlaylists = () => {
    client.get('/playlists').then((r) => setPlaylists(r.data || [])).catch(() => setPlaylists([]));
  };
  const fetchUsers = () => {
    adminApi.users().then((r) => setUsers(r.data || [])).catch(() => setUsers([]));
  };

  useEffect(() => {
    setLoading(true);
    if (tab === 'moderation') {
      adminApi.pendingTracks().then((r) => setPending(r.data || [])).catch(() => setPending([])).finally(() => setLoading(false));
    } else if (tab === 'playlists') {
      client.get('/playlists').then((r) => setPlaylists(r.data || [])).catch(() => setPlaylists([])).finally(() => setLoading(false));
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page admin-page">
      <h2 className="page-title">Админ-панель</h2>
      <div className="admin-tabs">
        <button type="button" className={tab === 'moderation' ? 'active' : ''} onClick={() => setTab('moderation')}>Модерация треков</button>
        <button type="button" className={tab === 'playlists' ? 'active' : ''} onClick={() => setTab('playlists')}>Плейлисты</button>
        <button type="button" className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>Пользователи</button>
      </div>
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
                  <TrackCard track={track} showStatus />
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
          <p className="admin-hint">Управление плейлистами — создание и редактирование через API. Список:</p>
          <ul className="playlist-list">
            {playlists.map((p) => (
              <li key={p._id}>
                <a href={`/playlist/${p._id}`} className="playlist-link">{p.title}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {tab === 'users' && (
        <div className="admin-users">
          <p className="admin-hint">Удаление аккаунтов пользователей администратором.</p>
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
          ) : (
            <div className="users-table-wrap">
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
                  {users.map((u) => (
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
        .admin-playlists .playlist-list { list-style: none; }
        .playlist-link { color: var(--neon-cyan); }
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
        @media (max-width: 900px) {
          .admin-page { padding-left: 0; padding-right: 0; }
        }
      `}</style>
    </motion.div>
  );
}
