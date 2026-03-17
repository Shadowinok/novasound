import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePlayer } from '../context/PlayerContext';

export default function TrackCard({ track, showStatus }) {
  const { loadTrack, currentTrack, playing } = usePlayer();
  const isCurrent = currentTrack?._id === track._id;

  const handlePlay = (e) => {
    e.preventDefault();
    loadTrack(track);
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
            {(typeof track.likes === 'number' ? track.likes : track.likes?.length) ? ` · ♥ ${typeof track.likes === 'number' ? track.likes : track.likes.length}` : ''}
          </div>
          {showStatus && track.status && (
            <span className={`track-status status-${track.status}`}>{track.status}</span>
          )}
        </div>
      </Link>
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
      `}</style>
    </motion.div>
  );
}
