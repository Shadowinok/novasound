import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import client from '../api/client';
import { charts, playlists } from '../api/client';
import TrackCard from '../components/TrackCard';
import { coverImageBackgroundStyle } from '../utils/coverImage';

export default function Home() {
  const [latest, setLatest] = useState([]);
  const [popular, setPopular] = useState([]);
  const [playlistList, setPlaylistList] = useState([]);

  useEffect(() => {
    client.get('/tracks', { params: { limit: 8, sort: '-createdAt' } }).then(r => setLatest(r.data.tracks || [])).catch(() => {});
    charts.weekly().then(r => setPopular((r.data || []).slice(0, 6))).catch(() => {});
    playlists.list().then(r => setPlaylistList((r.data || []).slice(0, 4))).catch(() => {});
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page home">
      <section className="hero">
        <h2 className="hero-title">AI Music</h2>
        <div className="hero-sub" aria-label="Описание площадки">
          <span className="hero-sub-line hero-sub-line--lead">Площадка про нейросети и музыку</span>
          <span className="hero-sub-line">слушай, загружай, смотри чарты</span>
        </div>
      </section>
      {popular.length > 0 && (
        <section>
          <h3 className="section-title">Популярное за неделю</h3>
          <div className="track-grid">
            {popular.map((t) => (
              <TrackCard key={t._id} track={t} />
            ))}
          </div>
        </section>
      )}
      {playlistList.length > 0 && (
        <section>
          <h3 className="section-title">Плейлисты</h3>
          <div className="playlist-grid">
            {playlistList.map((p) => (
              <Link key={p._id} to={`/playlist/${p._id}`} className="playlist-card">
                <div
                  className="playlist-cover"
                  style={coverImageBackgroundStyle(p.coverImage, p.updatedAt)}
                />
                <span className="playlist-title">{p.title}</span>
              </Link>
            ))}
          </div>
          <div className="section-more">
            <Link to="/playlists" className="neon-btn">Все плейлисты</Link>
          </div>
        </section>
      )}
      <section className="latest-section">
        <h3 className="section-title">Последние треки</h3>
        <div className="track-grid">
          {latest.map((t) => (
            <TrackCard key={t._id} track={t} />
          ))}
        </div>
      </section>
      <style>{`
        .page { padding: 0 8px; }
        .latest-section { margin-top: 56px; }
        .hero {
          text-align: center;
          padding: 48px 24px;
          margin-bottom: 40px;
        }
        .hero-title {
          font-family: var(--font-display);
          font-size: clamp(2.75rem, 7.5vw, 3.35rem);
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: none;
          background: linear-gradient(90deg, var(--neon-pink), var(--neon-cyan));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 auto 12px;
        }
        .hero-sub {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          max-width: 560px;
          margin: 0 auto;
          padding: 0 12px;
        }
        .hero-sub-line {
          display: block;
          width: 100%;
          text-align: center;
          color: rgba(165, 235, 248, 0.95);
          font-size: 1.1rem;
          line-height: 1.5;
          font-weight: 400;
          text-shadow: 0 0 24px rgba(5, 217, 232, 0.18);
        }
        .hero-sub-line--lead {
          font-weight: 600;
        }
        .section-title {
          font-size: 1.3rem;
          color: var(--neon-cyan);
          margin-bottom: 20px;
          padding-left: 4px;
        }
        .track-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 20px;
        }
        .playlist-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 20px;
        }
        .playlist-card {
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(211, 0, 197, 0.3);
          text-decoration: none;
          color: inherit;
          transition: box-shadow 0.2s;
        }
        .playlist-card:hover { box-shadow: 0 0 25px rgba(211, 0, 197, 0.4); }
        .playlist-cover {
          aspect-ratio: 1;
          background-size: cover;
          background-position: center;
        }
        .playlist-title {
          display: block;
          padding: 12px;
          font-family: var(--font-display);
          color: var(--neon-cyan);
        }
        .section-more { margin-top: 24px; text-align: center; }
        .neon-btn {
          display: inline-block;
          padding: 10px 24px;
          border: 2px solid var(--neon-cyan);
          color: var(--neon-cyan);
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .neon-btn:hover {
          background: rgba(5, 217, 232, 0.2);
          box-shadow: var(--glow-cyan);
        }
      `}</style>
    </motion.div>
  );
}
