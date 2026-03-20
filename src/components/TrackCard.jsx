import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import client, { playlists as playlistsApi } from '../api/client';

export default function TrackCard({ track, showStatus }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loadTrack, currentTrack, playing } = usePlayer();
  const isCurrent = currentTrack?._id === track._id;
  const [likesCount, setLikesCount] = useState(typeof track.likes === 'number' ? track.likes : (track.likes?.length ?? 0));
  const [dislikesCount, setDislikesCount] = useState(typeof track.dislikes === 'number' ? track.dislikes : (track.dislikes?.length ?? 0));
  const [liked, setLiked] = useState(Array.isArray(track.likes) && user && track.likes.some((l) => l?.toString?.() === user.id || l === user.id));
  const [disliked, setDisliked] = useState(Array.isArray(track.dislikes) && user && track.dislikes.some((l) => l?.toString?.() === user.id || l === user.id));
  const [reportText, setReportText] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [myPlaylists, setMyPlaylists] = useState([]);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const handlePlay = (e) => {
    e.preventDefault();
    loadTrack(track);
  };

  const ensureAuth = () => {
    if (!user) {
      navigate('/login');
      return false;
    }
    return true;
  };

  const handleLike = () => {
    if (!ensureAuth()) return;
    client.post(`/tracks/${track._id}/like`)
      .then((r) => {
        setLiked(!!r.data.liked);
        setDisliked(!!r.data.disliked);
        setLikesCount(Number(r.data.likes) || 0);
        setDislikesCount(Number(r.data.dislikes) || 0);
      })
      .catch(() => {});
  };

  const handleDislike = () => {
    if (!ensureAuth()) return;
    client.post(`/tracks/${track._id}/dislike`)
      .then((r) => {
        setLiked(!!r.data.liked);
        setDisliked(!!r.data.disliked);
        setLikesCount(Number(r.data.likes) || 0);
        setDislikesCount(Number(r.data.dislikes) || 0);
      })
      .catch(() => {});
  };

  const openPlaylistModal = () => {
    if (!ensureAuth()) return;
    setActionMessage('');
    setShowPlaylist(true);
    playlistsApi.myList().then((r) => setMyPlaylists(r.data || [])).catch(() => setMyPlaylists([]));
  };

  const handleCreatePlaylist = () => {
    if (!newPlaylistTitle.trim()) return;
    playlistsApi.createMy({ title: newPlaylistTitle.trim() })
      .then((r) => {
        setMyPlaylists((prev) => [r.data, ...prev]);
        setNewPlaylistTitle('');
      })
      .catch((e) => setActionMessage(e.response?.data?.message || 'Не удалось создать плейлист'));
  };

  const handleAddToPlaylist = (playlistId) => {
    playlistsApi.addTrack(playlistId, track._id)
      .then((r) => setActionMessage(r.data?.message || 'Добавлено'))
      .catch((e) => setActionMessage(e.response?.data?.message || 'Не удалось добавить трек'));
  };

  const handleSendReport = () => {
    if (!ensureAuth()) return;
    if (!reportText.trim() || reportText.trim().length < 10) {
      setActionMessage('Опишите проблему (минимум 10 символов)');
      return;
    }
    client.post(`/tracks/${track._id}/report`, { text: reportText.trim() })
      .then((r) => {
        setShowReport(false);
        setReportText('');
        setActionMessage(r.data?.message || 'Жалоба отправлена');
      })
      .catch((e) => setActionMessage(e.response?.data?.message || 'Не удалось отправить жалобу'));
  };

  return (
    <motion.div
      className="track-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 8px 30px rgba(5, 217, 232, 0.25)' }}
    >
      <Link to={`/track/${track._id}`} className="track-card-link">
        <div
          className="track-cover"
          style={{ backgroundImage: track.coverImage ? `url(${track.coverImage})` : 'linear-gradient(135deg, var(--neon-purple), var(--neon-pink))' }}
        >
          <button type="button" className="track-play-btn" onClick={handlePlay}>
            {isCurrent && playing ? '⏸' : '▶'}
          </button>
        </div>
        <div className="track-info">
          <div className="track-title">{track.title}</div>
          <div className="track-meta">
            {track.author?.username} · {track.plays ?? 0} прослушиваний
            {likesCount ? ` · ♥ ${likesCount}` : ''}
          </div>
          {showStatus && track.status && (
            <span className={`track-status status-${track.status}`}>{track.status}</span>
          )}
        </div>
      </Link>
      <div className="track-actions">
        <button type="button" className={`action-btn like ${liked ? 'active' : ''}`} onClick={handleLike}>♥ {likesCount}</button>
        <button type="button" className={`action-btn dislike ${disliked ? 'active' : ''}`} onClick={handleDislike}>👎 {dislikesCount}</button>
        <button type="button" className="action-btn playlist" onClick={openPlaylistModal}>В плейлист</button>
        <button type="button" className="action-btn report" onClick={() => setShowReport(true)}>Жалоба</button>
      </div>
      {actionMessage && <div className="track-action-msg">{actionMessage}</div>}

      {showReport && (
        <div className="card-overlay" onClick={() => setShowReport(false)}>
          <div className="card-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Жалоба на трек</h4>
            <textarea
              className="card-textarea"
              rows={4}
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Опишите проблему"
            />
            <div className="card-actions">
              <button type="button" className="mini-btn" onClick={() => setShowReport(false)}>Отмена</button>
              <button type="button" className="mini-btn primary" onClick={handleSendReport}>Отправить</button>
            </div>
          </div>
        </div>
      )}

      {showPlaylist && (
        <div className="card-overlay" onClick={() => setShowPlaylist(false)}>
          <div className="card-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Добавить в плейлист</h4>
            <div className="new-playlist">
              <input
                className="card-input"
                placeholder="Новый плейлист"
                value={newPlaylistTitle}
                onChange={(e) => setNewPlaylistTitle(e.target.value)}
              />
              <button type="button" className="mini-btn primary" onClick={handleCreatePlaylist}>Создать</button>
            </div>
            <div className="playlist-list">
              {myPlaylists.map((p) => (
                <div key={p._id} className="playlist-row">
                  <span>{p.title}</span>
                  <button type="button" className="mini-btn primary" onClick={() => handleAddToPlaylist(p._id)}>Добавить</button>
                </div>
              ))}
              {myPlaylists.length === 0 && <div className="track-action-msg">Плейлистов пока нет</div>}
            </div>
          </div>
        </div>
      )}
      <style>{`
        .track-card {
          background: var(--bg-card);
          border-radius: 12px;
          border: 1px solid rgba(5, 217, 232, 0.2);
          overflow: hidden;
          transition: border-color 0.2s;
        }
        .track-card:hover { border-color: var(--neon-cyan); }
        .track-card-link { display: block; text-decoration: none; color: inherit; }
        .track-cover {
          aspect-ratio: 1;
          background-size: cover;
          background-position: center;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .track-play-btn {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: 2px solid var(--neon-pink);
          background: rgba(255, 42, 109, 0.3);
          color: #fff;
          font-size: 1.4rem;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .track-card:hover .track-play-btn { opacity: 1; }
        .track-info { padding: 12px; }
        .track-title {
          font-family: var(--font-display);
          font-size: 1rem;
          color: var(--neon-cyan);
          margin-bottom: 4px;
        }
        .track-meta { font-size: 0.85rem; color: var(--text-dim); }
        .track-status {
          display: inline-block;
          margin-top: 6px;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
        }
        .status-pending { background: rgba(255, 200, 0, 0.2); color: #ffc800; }
        .status-approved { background: rgba(0, 255, 100, 0.2); color: #00ff64; }
        .status-rejected { background: rgba(255, 50, 50, 0.2); color: #ff3232; }
        .track-actions {
          display: flex;
          gap: 8px;
          padding: 0 12px 12px;
          flex-wrap: wrap;
        }
        .action-btn {
          border: 1px solid rgba(5, 217, 232, 0.35);
          background: transparent;
          color: var(--text);
          padding: 6px 8px;
          border-radius: 8px;
          font-size: 0.8rem;
        }
        .action-btn.like.active { color: var(--neon-pink); border-color: rgba(255, 42, 109, 0.55); }
        .action-btn.dislike.active { color: var(--neon-cyan); border-color: rgba(5, 217, 232, 0.6); }
        .action-btn.playlist { color: #b9b9ff; border-color: rgba(120, 120, 255, 0.5); }
        .action-btn.report { color: #ffc800; border-color: rgba(255, 200, 0, 0.5); }
        .track-action-msg {
          padding: 0 12px 12px;
          color: var(--text-dim);
          font-size: 0.8rem;
        }
        .card-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 350;
          padding: 14px;
        }
        .card-modal {
          width: 100%;
          max-width: 460px;
          border-radius: 14px;
          border: 1px solid rgba(5, 217, 232, 0.3);
          background: var(--bg-card);
          padding: 14px;
        }
        .card-textarea, .card-input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid rgba(5, 217, 232, 0.35);
          background: rgba(0,0,0,0.25);
          color: var(--text);
          margin: 8px 0;
        }
        .card-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }
        .mini-btn {
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid var(--text-dim);
          background: transparent;
          color: var(--text-dim);
        }
        .mini-btn.primary {
          border-color: var(--neon-cyan);
          color: var(--neon-cyan);
        }
        .new-playlist {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          margin: 8px 0;
        }
        .playlist-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 220px;
          overflow: auto;
        }
        .playlist-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(5, 217, 232, 0.18);
          border-radius: 8px;
          padding: 8px;
        }
      `}</style>
    </motion.div>
  );
}
