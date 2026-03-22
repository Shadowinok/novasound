import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

/**
 * Публичное «лицо» NovaSound: посыл и границы — в духе docs/курс развития от курсора.md
 */
export default function About() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page about-page">
      <h1 className="page-title">О проекте</h1>
      <div className="about-body">
        <p className="about-lead">
          NovaSound задуман как площадка, где на первом плане — <strong>нейросети и музыка</strong>: инструменты,
          честность про возможности и ограничения моделей, сообщество вокруг этого. Здесь можно слушать и
          выкладывать треки, в том числе сделанные с ИИ — но сам сервис держит рамку: <strong>это про ИИ и людей</strong>,
          а не «ещё один безликий хостинг файлов».
        </p>

        <h2>Посыл</h2>
        <p>
          Мы формулируем среду как <strong>диалог ИИ и людей</strong>: не мистификация «магии кнопки»,
          а нормальное отношение к авторству, этике и модерации. Правила и подсказки на сайте — часть этого посыла.
        </p>

        <h2>Дальше</h2>
        <p>
          <Link to="/radio">Радио NovaSound</Link> — отдельная линия: поток, голос, блоки про ИИ и музыку без политического шума,
          опора на ваши чарты и кураторские рамки. Сейчас это в стадии подготовки; на странице «Радио» — честный статус и план.
        </p>

        <p className="about-foot">
          <Link to="/terms">Правила сервиса</Link>
          {' · '}
          <Link to="/">На главную</Link>
        </p>
      </div>
      <style>{`
        .about-body {
          max-width: 720px;
          margin: 0 auto;
          padding: 8px 16px 48px;
          line-height: 1.65;
          color: var(--text);
        }
        .about-lead {
          font-size: 1.05rem;
          margin-bottom: 24px;
          padding: 16px 18px;
          border-radius: 12px;
          border: 1px solid rgba(5, 217, 232, 0.25);
          background: rgba(5, 217, 232, 0.06);
        }
        .about-body h2 {
          margin-top: 28px;
          margin-bottom: 10px;
          font-size: 1.15rem;
          color: var(--neon-cyan);
        }
        .about-body ul { margin: 8px 0 8px 20px; }
        .about-body li { margin-bottom: 6px; }
        .about-body a { color: var(--neon-pink); text-decoration: none; border-bottom: 1px solid rgba(255, 42, 109, 0.35); }
        .about-body a:hover { text-shadow: 0 0 12px rgba(255, 42, 109, 0.35); }
        .about-foot { margin-top: 32px; font-size: 0.95rem; color: var(--text-dim); }
      `}</style>
    </motion.div>
  );
}
