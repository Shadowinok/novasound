import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import client from '../api/client';
import { charts, playlists } from '../api/client';
import TrackCard from '../components/TrackCard';
import GuestRadioMiniPlayer from '../components/GuestRadioMiniPlayer';
import { useAuth } from '../context/AuthContext';
import { coverImageBackgroundStyle } from '../utils/coverImage';

export default function Home() {
  const { user } = useAuth();
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
        if (a.kind === 'gaming-news') {
          return { kind: 'gaming-news', text: `Игры: ${a.title}` };
        }
        if (a.kind === 'film-news') {
          return { kind: 'film-news', text: `Кино: ${a.title}` };
        }
        if (a.kind === 'industry-news') {
          return { kind: 'industry-news', text: `Цифровая индустрия: ${a.title}` };
        }
        if (a.kind === 'software-news') {
          return { kind: 'software-news', text: `Софтовые сервисы: ${a.title}` };
        }
        if (a.kind === 'robots-news') {
          return { kind: 'robots-news', text: `Роботы: ${a.title}` };
        }
        if (a.kind === 'releases-news') {
          return { kind: 'releases-news', text: `Релизы и индустрия: ${a.title}` };
        }
        if (a.kind === 'new-track') return { kind: 'new-track', text: `Новинка: ${a.title}` };
        return null;
      })
      .filter(Boolean);
    // Укорачиваем по-разному: объявления должны читаться полностью.
    const maxByKind = {
      announcement: 320,
      radio: 140,
      'radio-offline': 80,
      weather: 120,
      'ai-news': 160,
      'ai-creative-news': 180,
      'ai-music-news': 180,
      'gaming-news': 180,
      'film-news': 180,
      'industry-news': 190,
      'software-news': 190,
      'robots-news': 190,
      'releases-news': 190,
      'new-track': 120
    };
    return segments.map((s) => {
      const max = maxByKind[s.kind] ?? 160;
      return { ...s, text: String(s.text).slice(0, max) };
    });
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
        {!user && (
          <div className="hero-mini-player">
            <GuestRadioMiniPlayer />
          </div>
        )}
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
          position: relative;
        }
        .hero-mini-player {
          position: absolute;
          right: 0;
          top: 8px;
          width: 240px;
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
        .guest-mini-player {
          border: 1px solid rgba(5, 217, 232, 0.35);
          background: rgba(8, 12, 24, 0.9);
          border-radius: 10px;
          padding: 8px 10px 6px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          box-shadow: 0 0 20px rgba(5, 217, 232, 0.1);
        }
        .guest-mini-player__btn {
          align-self: center;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 1px solid rgba(255, 42, 109, 0.6);
          background: rgba(255, 42, 109, 0.15);
          color: var(--neon-pink);
          font-size: 0.95rem;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .guest-mini-player__progress {
          position: relative;
          height: 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          overflow: hidden;
        }
        .guest-mini-player__load {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          background: rgba(5, 217, 232, 0.35);
        }
        .guest-mini-player__play {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          background: rgba(5, 217, 232, 0.95);
        }
        .guest-mini-player__dot {
          position: absolute;
          right: 3px;
          top: 50%;
          width: 8px;
          height: 8px;
          margin-top: -4px;
          border-radius: 50%;
          background: var(--neon-cyan);
          box-shadow: 0 0 8px rgba(5, 217, 232, 0.8);
        }
        .guest-mini-player__dot.is-loading {
          animation: miniPulse .9s ease-in-out infinite;
        }
        @keyframes miniPulse {
          0%, 100% { transform: scale(0.85); opacity: 0.6; }
          50% { transform: scale(1.12); opacity: 1; }
        }
        .guest-mini-player__ticker-wrap {
          width: 100%;
          overflow: hidden;
          border-top: 1px solid rgba(255, 255, 255, 0.14);
          padding-top: 5px;
        }
        .guest-mini-player__ticker {
          white-space: nowrap;
          display: inline-block;
          color: var(--neon-cyan);
          font-size: 0.76rem;
          line-height: 1.2;
          text-shadow: 0 0 10px rgba(5, 217, 232, 0.35);
          animation: miniTicker 16s linear infinite;
        }
        @keyframes miniTicker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
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
          animation: news-ticker-marquee 110s linear infinite;
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
        .news-ticker-item--gaming-news { color: #ffe08a; text-shadow: 0 0 18px rgba(255, 220, 80, 0.14); }
        .news-ticker-item--film-news { color: #ff9ad5; text-shadow: 0 0 18px rgba(255, 120, 220, 0.14); }
        .news-ticker-item--industry-news { color: var(--neon-cyan); text-shadow: 0 0 18px rgba(5, 217, 232, 0.16); }
        .news-ticker-item--software-news { color: #7dff9b; text-shadow: 0 0 18px rgba(80, 255, 120, 0.14); }
        .news-ticker-item--robots-news { color: #9bd8ff; text-shadow: 0 0 18px rgba(70, 190, 255, 0.16); }
        .news-ticker-item--releases-news { color: #f0c8ff; text-shadow: 0 0 18px rgba(200, 120, 255, 0.16); }
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
          .guest-mini-player__ticker { animation: none; }
        }
        @media (max-width: 1024px) {
          .hero-mini-player {
            position: static;
            margin: 14px auto 0;
            width: min(280px, 90%);
          }
        }
      `}</style>
    </motion.div>
  );
}
