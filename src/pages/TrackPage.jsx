import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import client from '../api/client';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { playlists as playlistsApi } from '../api/client';
import { getTrackStatusMeta } from '../utils/moderationStatus';

export default function TrackPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportError, setReportError] = useState('');
  const [reportSuccess, setReportSuccess] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [myPlaylists, setMyPlaylists] = useState([]);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [playlistMessage, setPlaylistMessage] = useState('');
  const { loadTrack, currentTrack, playing, togglePlay } = usePlayer();
  const { user } = useAuth();

  useEffect(() => {
    client.get(`/tracks/${id}`)
      .then((r) => {
        setTrack(r.data);
        setLiked(Array.isArray(r.data.likes) && user && r.data.likes.some(l => l.toString?.() === user.id || l === user.id));
        setDisliked(Array.isArray(r.data.dislikes) && user && r.data.dislikes.some(l => l.toString?.() === user.id || l === user.id));
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id, user?.id]);

  const handlePlay = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!user) {
      navigate('/login');
      return;
    }
    if (track) loadTrack(track);
  };

  const handleLike = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    client.post(`/tracks/${id}/like`)
      .then((r) => {
        setLiked(r.data.liked);
        setDisliked(r.data.disliked);
        setTrack((prev) => prev ? { ...prev, likes: r.data.likes } : null);
      })
      .catch(() => {});
  };

  const handleDislike = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    client.post(`/tracks/${id}/dislike`)
      .then((r) => {
        setLiked(r.data.liked);
        setDisliked(r.data.disliked);
        setTrack((prev) => prev ? { ...prev, likes: r.data.likes, dislikes: r.data.dislikes } : null);
      })
      .catch(() => {});
  };

  const handleReport = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setReportError('');
    setReportSuccess('');
    if (!reportText.trim() || reportText.trim().length < 10) {
      setReportError('Опишите жалобу (минимум 10 символов)');
      return;
    }
    setReportLoading(true);
    client.post(`/tracks/${id}/report`, { text: reportText.trim() })
      .then((r) => {
        setReportSuccess(r.data?.message || 'Жалоба отправлена');
        setReportText('');
      })
      .catch((e) => {
        setReportError(e.response?.data?.message || 'Не удалось отправить жалобу');
      })
      .finally(() => setReportLoading(false));
  };

  const openPlaylistModal = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setPlaylistMessage('');
    setShowPlaylistModal(true);
    playlistsApi.myList().then((r) => setMyPlaylists(r.data || [])).catch(() => setMyPlaylists([]));
  };

  const handleCreatePlaylist = () => {
    if (!newPlaylistTitle.trim()) return;
    playlistsApi.createMy({ title: newPlaylistTitle.trim() })
      .then((r) => {
        setMyPlaylists((prev) => [r.data, ...prev]);
        setNewPlaylistTitle('');
      })
      .catch((e) => setPlaylistMessage(e.response?.data?.message || 'Не удалось создать плейлист'));
  };

  const handleAddToPlaylist = (playlistId) => {
    playlistsApi.addTrack(playlistId, id)
      .then((r) => setPlaylistMessage(r.data?.message || 'Добавлено'))
      .catch((e) => setPlaylistMessage(e.response?.data?.message || 'Не удалось добавить трек'));
  };

  if (loading || !track) {
    return <div className="page"><div className="loading">Загрузка...</div></div>;
  }

  const isCurrent = currentTrack?._id === track._id;
  const statusMeta = getTrackStatusMeta(track);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page track-page">
      <div className="track-detail">
        <div
          className="track-detail-cover"
          style={{ backgroundImage: track.coverImage ? `url(${track.coverImage})` : 'linear-gradient(135deg, var(--neon-purple), var(--neon-pink))' }}
        >
          <button type="button" className="big-play" onClick={handlePlay} title={user ? 'Слушать' : 'Войдите, чтобы слушать'}>
            {!user ? '🔒' : isCurrent && playing ? '⏸' : '▶'}
          </button>
        </div>
        <div className="track-detail-info">
          <h1 className="track-detail-title">{track.title}</h1>
          <p className="track-detail-author">{track.author?.username}</p>
          {!user && (
            <p className="track-login-hint">Войдите, чтобы слушать треки. Без регистрации доступна только информация о треках.</p>
          )}
          <div className="track-detail-stats">
            <span>▶ {track.plays ?? 0}</span>
            <button type="button" className={`like-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
              ♥ {typeof track.likes === 'number' ? track.likes : (track.likes?.length ?? 0)}
            </button>
            <button type="button" className={`dislike-btn ${disliked ? 'active' : ''}`} onClick={handleDislike}>
              👎 {typeof track.dislikes === 'number' ? track.dislikes : (track.dislikes?.length ?? 0)}
            </button>
            <button type="button" className="playlist-btn" onClick={openPlaylistModal}>В плейлист</button>
            <button type="button" className="report-btn" onClick={() => setShowReport(true)}>
              Пожаловаться
            </button>
          </div>
          {track.description && <p className="track-detail-desc">{track.description}</p>}
          {track.status && track.status !== 'approved' && (
            <p className="track-status-note" title={statusMeta.hint}>Статус: {statusMeta.label}</p>
          )}
        </div>
      </div>
      <style>{`
        .track-page { max-width: 700px; margin: 0 auto; }
        .track-detail { display: flex; flex-direction: column; gap: 24px; }
        .track-detail-cover {
          aspect-ratio: 1;
          max-width: 320px;
          border-radius: 16px;
          background-size: cover;
          background-position: center;
          border: 2px solid var(--neon-cyan);
          box-shadow: 0 0 40px rgba(5, 217, 232, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .big-play {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 3px solid var(--neon-pink);
          background: rgba(255, 42, 109, 0.4);
          color: #fff;
          font-size: 2rem;
          box-shadow: 0 0 30px rgba(255, 42, 109, 0.5);
        }
        .big-play:hover { background: rgba(255, 42, 109, 0.6); }
        .track-detail-title { font-size: 1.8rem; color: var(--neon-cyan); margin-bottom: 8px; }
        .track-detail-author { color: var(--text-dim); margin-bottom: 12px; }
        .track-login-hint { color: #ffc800; font-size: 0.95rem; margin-bottom: 12px; max-width: 420px; }
        .track-detail-stats { display: flex; gap: 16px; margin-bottom: 16px; }
        .like-btn {
          border: 1px solid var(--neon-pink);
          background: transparent;
          color: var(--neon-pink);
          padding: 6px 12px;
          border-radius: 6px;
        }
        .like-btn.liked { background: rgba(255, 42, 109, 0.3); }
        .dislike-btn {
          border: 1px solid rgba(5, 217, 232, 0.5);
          background: transparent;
          color: var(--neon-cyan);
          padding: 6px 12px;
          border-radius: 6px;
        }
        .dislike-btn.active { background: rgba(5, 217, 232, 0.2); }
        .playlist-btn {
          border: 1px solid rgba(120, 120, 255, 0.6);
          background: transparent;
          color: #b9b9ff;
          padding: 6px 12px;
          border-radius: 6px;
        }
        .playlist-btn:hover { background: rgba(120, 120, 255, 0.12); }
        .report-btn {
          border: 1px solid rgba(255, 200, 0, 0.6);
          background: transparent;
          color: var(--text);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.9rem;
          color: #ffc800;
        }
        .report-btn:hover { background: rgba(255, 200, 0, 0.12); }
        .track-detail-desc { color: var(--text-dim); line-height: 1.6; }
        .track-status-note { color: #ffc800; font-size: 0.9rem; }
        .loading { text-align: center; padding: 48px; color: var(--text-dim); }
      `}</style>

      {showReport && (
        <div className="report-overlay" onClick={() => setShowReport(false)}>
          <div className="report-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="report-title">Жалоба на трек</h3>
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              rows={5}
              className="report-textarea"
              placeholder="Опишите проблему. Чем подробнее — тем быстрее админ/ИИ разберётся."
            />
            {reportSuccess && <div className="report-success">{reportSuccess}</div>}
            {reportError && <div className="report-error">{reportError}</div>}
            <div className="report-actions">
              <button type="button" className="report-cancel" onClick={() => setShowReport(false)} disabled={reportLoading}>
                Отмена
              </button>
              <button type="button" className="report-submit" onClick={handleReport} disabled={reportLoading}>
                {reportLoading ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </div>
          <style>{`
            .report-overlay {
              position: fixed;
              inset: 0;
              background: rgba(0,0,0,0.75);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 300;
              padding: 18px;
            }
            .report-modal {
              width: 100%;
              max-width: 520px;
              background: var(--bg-card);
              border: 1px solid rgba(255, 200, 0, 0.35);
              border-radius: 16px;
              padding: 20px;
              box-shadow: 0 0 40px rgba(255, 200, 0, 0.12);
            }
            .report-title { color: #ffc800; margin-bottom: 12px; }
            .report-textarea {
              width: 100%;
              padding: 12px 14px;
              background: rgba(0,0,0,0.3);
              border: 1px solid rgba(255, 200, 0, 0.35);
              border-radius: 10px;
              color: var(--text);
              margin-bottom: 12px;
            }
            .report-error { color: #ff6b6b; margin-bottom: 12px; font-size: 0.9rem; }
            .report-success { color: #00ff64; margin-bottom: 12px; font-size: 0.9rem; }
            .report-actions { display: flex; gap: 12px; justify-content: flex-end; }
            .report-cancel {
              padding: 10px 16px;
              border: 1px solid var(--text-dim);
              background: transparent;
              color: var(--text-dim);
              border-radius: 10px;
            }
            .report-submit {
              padding: 10px 16px;
              border: 1px solid rgba(255, 200, 0, 0.6);
              background: rgba(255, 200, 0, 0.12);
              color: #ffc800;
              border-radius: 10px;
              font-weight: 600;
            }
          `}</style>
        </div>
      )}

      {showPlaylistModal && (
        <div className="report-overlay" onClick={() => setShowPlaylistModal(false)}>
          <div className="report-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="report-title">Добавить в плейлист</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                className="report-textarea"
                style={{ minHeight: 44 }}
                placeholder="Новый плейлист"
                value={newPlaylistTitle}
                onChange={(e) => setNewPlaylistTitle(e.target.value)}
              />
              <button type="button" className="report-submit" onClick={handleCreatePlaylist}>Создать</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflow: 'auto' }}>
              {myPlaylists.map((p) => (
                <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <span>{p.title}</span>
                  <button type="button" className="report-submit" onClick={() => handleAddToPlaylist(p._id)}>Добавить</button>
                </div>
              ))}
              {myPlaylists.length === 0 && <div className="report-error">Плейлистов пока нет</div>}
            </div>
            {playlistMessage && <div className="report-error" style={{ color: '#00ff64' }}>{playlistMessage}</div>}
            <div className="report-actions">
              <button type="button" className="report-cancel" onClick={() => setShowPlaylistModal(false)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
