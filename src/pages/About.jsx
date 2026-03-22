import React from 'react';
import { motion } from 'framer-motion';

/**
 * Публичное «лицо» NovaSound: посыл и границы — в духе docs/курс развития от курсора.md
 */
export default function About() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page about-page">
      <h1 className="page-title about-main-title">О проекте</h1>
      <div className="about-body">
        <p className="about-lead">
          NovaSound задуман как площадка, где на первом плане — <strong>нейросети и музыка</strong>: инструменты,
          честность про возможности и ограничения моделей, сообщество вокруг этого. Здесь можно слушать и выкладывать
          треки, в том числе сделанные с ИИ — сервис держит рамку: <strong>это про ИИ и людей</strong>, а не безликий
          хостинг файлов. Мы называем это <strong>диалогом ИИ и людей</strong> — без мистификации «магии кнопки», с
          нормальным отношением к авторству, этике и модерации; правила и подсказки на сайте — часть этого.
        </p>
      </div>
      <style>{`
        .about-main-title {
          width: 100%;
          text-align: center;
        }
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
      `}</style>
    </motion.div>
  );
}
