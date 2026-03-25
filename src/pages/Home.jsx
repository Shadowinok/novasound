import React, { useEffect, useMemo, useState } from 'react';
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
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    let alive = true;
    const loadAnnouncements = () =>
      client
        .get('/announcements', { params: { limit: 10 } })
        .then((r) => {
          if (!alive) return;
          setAnnouncements(Array.isArray(r.data?.items) ? r.data.items : []);
        })
        .catch(() => {});

    client.get('/tracks', { params: { limit: 8, sort: '-createdAt' } }).then(r => setLatest(r.data.tracks || [])).catch(() => {});
    charts.weekly().then(r => setPopular((r.data || []).slice(0, 6))).catch(() => {});

    loadAnnouncements();
    const t = window.setInterval(loadAnnouncements, 20000);

    playlists
      .featured(6)
      .then((r) => {
        const arr = r.data || [];
        if (arr.length) {
          setPlaylistList(arr.slice(0, 6));
          return;
        }
        return playlists.list().then((rr) => setPlaylistList((rr.data || []).slice(0, 6)));
      })
      .catch(() => {
        playlists.list().then((rr) => setPlaylistList((rr.data || []).slice(0, 6))).catch(() => {});
      });
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);

  const tickerSegments = useMemo(() => {
    const items = Array.isArray(announcements) ? announcements : [];
    const segments = items
      .map((a) => {
        if (a.kind === 'radio') return { kind: 'radio', text: `В эфире: ${a.title}` };
        if (a.kind === 'radio-offline') return { kind: 'radio-offline', text: 'Эфир оффлайн' };
        if (a.kind === 'announcement') {
          const msg = a.message ? ` — ${String(a.message).trim()}` : '';
          return { kind: 'announcement', text: `Анонс: ${a.title}${msg}` };
        }
        if (a.kind === 'weather') {
          const tempText = Number.isFinite(Number(a.temperatureC)) ? `${a.temperatureC}°C` : 'н/д';
          const windText = Number.isFinite(Number(a.windSpeed)) ? `, ветер ${a.windSpeed} м/с` : '';
          return { kind: 'weather', text: `Погода: ${a.city} ${tempText}${windText}` };
        }
        if (a.kind === 'ai-news') {
          return { kind: 'ai-news', text: `ИИ: ${a.title}` };
        }
        if (a.kind === 'ai-creative-news') {
          return { kind: 'ai-creative-news', text: `ИИ-креатив: ${a.title}` };
        }
        if (a.kind === 'ai-music-news') {
          return { kind: 'ai-music-news', text: `ИИ-музыка: ${a.title}` };
        }
        if (a.kind === 'new-track') return { kind: 'new-track', text: `Новинка: ${a.title}` };
        return null;
      })
      .filter(Boolean);
    // Слегка укоротим сообщения, чтобы лента не раздувалась.
    return segments.map((s) => ({ ...s, text: String(s.text).slice(0, 140) }));
  }, [announcements]);

  const renderTickerSequence = (loopIdx) => {
    const seq = [];
    tickerSegments.forEach((s, i) => {
      if (i > 0) {
        seq.push(<span key={`sep-${loopIdx}-${i}`} className="news-ticker-sep"> • </span>);
      }
      seq.push(
        <span
          key={`seg-${loopIdx}-${i}`}
          className={`news-ticker-item news-ticker-item--${s.kind}`}
        >
          {s.text}
        </span>
      );
    });
    return seq;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page home">
      <section className="hero">
        <h2 className="hero-title">AI Music</h2>
        <div className="hero-sub" aria-label="Описание площадки">
          <span className="hero-sub-line hero-sub-line--lead">Площадка про нейросети и музыку</span>
          <span className="hero-sub-line">слушай, загружай, смотри чарты</span>
        </div>
      </section>
      {tickerSegments.length > 0 && (
        <section className="news-ticker-section" aria-label="Новостная лента">
          <div className="news-ticker">
            <div className="news-ticker-track" aria-hidden="true">
              {renderTickerSequence(0)}
              {renderTickerSequence(1)}
            </div>
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
        </section>
      )}
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
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
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

        .news-ticker-section { margin-top: 18px; }
        .news-ticker {
          border: 1px solid rgba(5, 217, 232, 0.28);
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          overflow: hidden;
        }
        .news-ticker-track {
          display: flex;
          align-items: center;
          white-space: nowrap;
          width: max-content;
          padding: 10px 0;
          gap: 0;
          animation: news-ticker-marquee 55s linear infinite;
          will-change: transform;
        }
        .news-ticker:hover .news-ticker-track { animation-play-state: paused; }
        .news-ticker-item {
          font-family: var(--font-display);
          font-size: 0.98rem;
          padding: 0 14px;
          color: var(--neon-cyan);
          text-shadow: 0 0 18px rgba(5, 217, 232, 0.16);
        }
        .news-ticker-item--radio { color: var(--neon-pink); }
        .news-ticker-item--radio-offline { color: #ff6b6b; text-shadow: 0 0 18px rgba(255, 50, 50, 0.18); }
        .news-ticker-item--announcement { color: #ffd65a; text-shadow: 0 0 18px rgba(255, 200, 0, 0.14); }
        .news-ticker-item--ai-news { color: #c6b6ff; text-shadow: 0 0 18px rgba(160, 120, 255, 0.16); }
        .news-ticker-item--ai-creative-news { color: #ffd3ff; text-shadow: 0 0 18px rgba(255, 120, 255, 0.16); }
        .news-ticker-item--ai-music-news { color: #b9ffda; text-shadow: 0 0 18px rgba(0, 255, 160, 0.14); }
        .news-ticker-item--weather { color: #9ee7ff; text-shadow: 0 0 18px rgba(70, 190, 255, 0.16); }
        .news-ticker-item--new-track { color: var(--neon-cyan); }
        .news-ticker-sep {
          color: rgba(165, 235, 248, 0.55);
          font-size: 0.95rem;
          padding: 0 6px;
        }
        @keyframes news-ticker-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .news-ticker-track { animation: none; }
        }
      `}</style>
    </motion.div>
  );
}
