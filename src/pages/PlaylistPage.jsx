import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import client, { playlists as playlistsApi } from '../api/client';
import TrackCard from '../components/TrackCard';
import { useAuth } from '../context/AuthContext';
import { coverImageBackgroundStyle } from '../utils/coverImage';

function isPlaylistOwner(playlist, user) {
  if (!playlist || !user) return false;
  const uid = user.id || user._id;
  const owner = playlist.createdBy?._id || playlist.createdBy;
  return String(owner) === String(uid);
}

export default function PlaylistPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ownerBusy, setOwnerBusy] = useState(false);
  const [ownerMsg, setOwnerMsg] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    client
      .get(`/playlists/${id}`)
      .then((r) => setPlaylist(r.data))
      .catch(() => {
        setPlaylist(null);
        setError('not_found');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const owner = playlist && isPlaylistOwner(playlist, user);
  const isPrivate = playlist && playlist.isPublic === false;
  const isPublicEditorial = playlist && playlist.isPublic === true;

  const handleDelete = () => {
    if (!owner || !playlist) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm('Удалить этот плейлист? Треки с площадки не удалятся.')) return;
    setOwnerBusy(true);
    setOwnerMsg('');
    playlistsApi
      .deleteMy(playlist._id)
      .then(() => {
        navigate('/profile');
      })
      .catch((e) => setOwnerMsg(e.response?.data?.message || 'Не удалось удалить'))
      .finally(() => setOwnerBusy(false));
  };

  if (loading) {
    return (
      <div className="page playlist-detail-page">
        <div className="loading">Загрузка...</div>
        <style>{`
          .playlist-detail-page { max-width: 1100px; margin: 0 auto; padding-left: 280px; padding-right: 24px; }
          @media (max-width: 900px) { .playlist-detail-page { padding-left: 0; padding-right: 0; } }
          .loading { text-align: center; padding: 48px; color: var(--text-dim); }
        `}</style>
      </div>
    );
  }

  if (error === 'not_found' || !playlist) {
    return (
      <div className="page playlist-detail-page">
        <div className="loading">
          Плейлист не найден или недоступен. Приватные плейлисты видны только автору (войдите в аккаунт).
        </div>
        <Link to="/playlists" className="playlist-back">Все плейлисты</Link>
        <style>{`
          .playlist-detail-page { max-width: 1100px; margin: 0 auto; padding-left: 280px; padding-right: 24px; }
          @media (max-width: 900px) { .playlist-detail-page { padding-left: 0; padding-right: 0; } }
          .loading { text-align: center; padding: 48px; color: var(--text-dim); max-width: 520px; margin: 0 auto; line-height: 1.5; }
          .playlist-back { display: inline-block; margin-top: 16px; color: var(--neon-cyan); }
        `}</style>
      </div>
    );
  }

  const tracks = (playlist.tracks || []).filter(Boolean);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page playlist-detail-page">
      <div className="playlist-header">
        <div
          className="playlist-header-cover"
          style={coverImageBackgroundStyle(playlist.coverImage, playlist.updatedAt)}
        />
        <div>
          <h1 className="playlist-header-title">
            {playlist.title}
            {isPrivate && <span className="playlist-privacy-badge">Личный</span>}
            {!isPrivate && <span className="playlist-privacy-badge pub">В каталоге</span>}
          </h1>
          {playlist.description && <p className="playlist-header-desc">{playlist.description}</p>}
          <p className="playlist-header-meta">Треков: {tracks.length}</p>
          {owner && (
            <div className="playlist-owner-actions">
              {isPublicEditorial && isAdmin && (
                <Link to="/admin" className="playlist-owner-btn">Редактировать в админке</Link>
              )}
              {playlist.isPublic !== true && (
              <button type="button" className="playlist-owner-btn danger" disabled={ownerBusy} onClick={handleDelete}>
                Удалить плейлист
              </button>
              )}
            </div>
          )}
          {ownerMsg && <p className="playlist-owner-msg">{ownerMsg}</p>}
        </div>
      </div>
      <div className="track-grid">
        {tracks.map((t, i) => (
          <TrackCard key={t._id} track={t} playQueue={tracks} playQueueIndex={i} />
        ))}
      </div>
      <style>{`
        .playlist-detail-page {
          max-width: 1100px;
          margin: 0 auto;
          padding-left: 280px;
          padding-right: 24px;
        }
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
        .playlist-header-title { font-size: 1.8rem; color: var(--neon-cyan); margin-bottom: 8px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
        .playlist-privacy-badge {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 200, 0, 0.45);
          color: #ffc800;
        }
        .playlist-privacy-badge.pub {
          border-color: rgba(0, 255, 100, 0.4);
          color: #69db7c;
        }
        .playlist-header-desc, .playlist-header-meta { color: var(--text-dim); margin-bottom: 4px; }
        .playlist-owner-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          margin-top: 12px;
        }
        .playlist-owner-btn {
          padding: 8px 14px;
          border: 1px solid rgba(5, 217, 232, 0.55);
          background: rgba(0,0,0,0.25);
          color: var(--neon-cyan);
          border-radius: 8px;
          font-size: 0.9rem;
        }
        .playlist-owner-btn:hover:not(:disabled) { background: rgba(5, 217, 232, 0.12); }
        .playlist-owner-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .playlist-owner-btn.danger {
          border-color: rgba(255, 80, 80, 0.55);
          color: #ff6b6b;
        }
        .playlist-owner-msg { color: #69db7c; margin-top: 8px; font-size: 0.9rem; }
        .track-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 20px;
        }
        .loading { text-align: center; padding: 48px; color: var(--text-dim); }
        @media (max-width: 900px) {
          .playlist-detail-page { padding-left: 0; padding-right: 0; }
        }
      `}</style>
    </motion.div>
  );
}
