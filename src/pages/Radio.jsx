import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

/**
 * Этап 0 из docs/развитие радио.md — честный статус без фейкового «эфира»
 */
export default function Radio() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page radio-page">
      <h1 className="page-title">NovaSound Radio</h1>
      <p className="radio-tagline">Интернет-станция про ИИ и музыку — в разработке</p>

      <div className="radio-body">
        <section className="radio-block radio-now">
          <h2>Сейчас</h2>
          <p>
            Потокового эфира и круглосуточного «ведущего» пока нет — зато уже работают{' '}
            <Link to="/catalog">каталог</Link>, <Link to="/charts">чарты</Link> и{' '}
            <Link to="/playlists">плейлисты</Link>. Их можно слушать как основу будущей сетки вещания.
          </p>
        </section>

        <section className="radio-block">
          <h2>Ближайший шаг (этап 0)</h2>
          <ul>
            <li>один управляемый поток или плейлист с ротацией одобренных треков;</li>
            <li>короткие джинглы или заранее записанные / TTS-фразы — без часов импровизации;</li>
            <li>новости и погода не автоматом из сети без фильтров — сначала ручной или шаблонный контроль;</li>
            <li>упоминания чартов NovaSound — только из вашей базы, без выдуманных цифр.</li>
          </ul>
        </section>

        <section className="radio-block">
          <h2>Потом</h2>
          <p>
            Расписание слотов, whitelist источников для новостей (ИИ + музыка, без политики), интеграция с чартами для
            коротких голосовых вставок — как в нашем плане в репозитории.
          </p>
        </section>

        <div className="radio-cta">
          <Link to="/charts" className="radio-btn">Чарты</Link>
          <Link to="/playlists" className="radio-btn radio-btn-ghost">Плейлисты</Link>
          <Link to="/about" className="radio-link-quiet">О проекте</Link>
        </div>
      </div>

      <style>{`
        .radio-page { padding-bottom: 48px; }
        .radio-tagline {
          text-align: center;
          color: var(--neon-cyan);
          font-size: 1rem;
          margin: -8px 0 24px;
          letter-spacing: 0.04em;
        }
        .radio-body {
          max-width: 720px;
          margin: 0 auto;
          padding: 0 16px;
        }
        .radio-block {
          margin-bottom: 28px;
          line-height: 1.6;
          color: var(--text);
        }
        .radio-block h2 {
          font-size: 1.1rem;
          color: var(--neon-pink);
          margin-bottom: 10px;
        }
        .radio-block ul { margin: 0 0 0 18px; }
        .radio-block li { margin-bottom: 6px; }
        .radio-block a {
          color: var(--neon-cyan);
          text-decoration: none;
          border-bottom: 1px solid rgba(5, 217, 232, 0.35);
        }
        .radio-block a:hover { text-shadow: var(--glow-cyan); }
        .radio-cta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 16px;
          margin-top: 36px;
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .radio-btn {
          display: inline-block;
          padding: 10px 22px;
          border: 2px solid var(--neon-pink);
          color: var(--neon-pink);
          border-radius: 8px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
        }
        .radio-btn:hover { background: rgba(255, 42, 109, 0.15); box-shadow: 0 0 20px rgba(255, 42, 109, 0.25); }
        .radio-btn-ghost {
          border-color: rgba(5, 217, 232, 0.55);
          color: var(--neon-cyan);
        }
        .radio-btn-ghost:hover { background: rgba(5, 217, 232, 0.06); box-shadow: var(--glow-cyan); }
        .radio-link-quiet {
          color: var(--text-dim);
          font-size: 0.95rem;
          margin-left: auto;
        }
        .radio-link-quiet:hover { color: var(--text); }
      `}</style>
    </motion.div>
  );
}
