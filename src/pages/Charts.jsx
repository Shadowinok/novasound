import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { charts as chartsApi } from '../api/client';
import TrackCard from '../components/TrackCard';

const TABS = [
  { key: 'weekly', label: 'Неделя' },
  { key: 'monthly', label: 'Месяц' },
  { key: 'alltime', label: 'Всё время' }
];

export default function Charts() {
  const [active, setActive] = useState('weekly');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fn = active === 'weekly' ? chartsApi.weekly : active === 'monthly' ? chartsApi.monthly : chartsApi.alltime;
    fn().then((r) => setData(r.data || [])).catch(() => setData([])).finally(() => setLoading(false));
  }, [active]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page charts-page">
      <h2 className="page-title">Чарты</h2>
      <div className="charts-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`chart-tab ${active === tab.key ? 'active' : ''}`}
            onClick={() => setActive(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : data.length === 0 ? (
        <div className="empty">Нет данных</div>
      ) : (
        <div className="charts-list">
          {data.map((track, i) => (
            <motion.div key={track._id} className="chart-row" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
              <span className="chart-rank">#{i + 1}</span>
              <TrackCard track={track} />
            </motion.div>
          ))}
        </div>
      )}
      <style>{`
        .page-title { color: var(--neon-cyan); margin-bottom: 24px; }
        .charts-tabs { display: flex; gap: 8px; margin-bottom: 24px; }
        .chart-tab {
          padding: 10px 20px;
          border: 1px solid var(--neon-purple);
          background: transparent;
          color: var(--text);
          border-radius: 8px;
        }
        .chart-tab.active {
          background: rgba(211, 0, 197, 0.3);
          border-color: var(--neon-pink);
          color: var(--neon-pink);
        }
        .charts-list { display: flex; flex-direction: column; gap: 16px; }
        .chart-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .chart-rank {
          font-family: var(--font-display);
          font-size: 1.2rem;
          color: var(--neon-pink);
          min-width: 40px;
        }
        .chart-row .track-card { flex: 1; }
        .loading, .empty { text-align: center; padding: 48px; color: var(--text-dim); }
      `}</style>
    </motion.div>
  );
}
