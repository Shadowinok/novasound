import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const items = [
  { path: '/', label: 'Главная', icon: '⌂' },
  { path: '/radio', label: 'Радио', icon: '◐' },
  { path: '/catalog', label: 'Каталог', icon: '♫' },
  { path: '/charts', label: 'Чарты', icon: '▣' },
  { path: '/playlists', label: 'Плейлисты', icon: '◉' },
  { path: '/profile', label: 'Кабинет', icon: '⚙', auth: true },
  { path: '/admin', label: 'Админ', icon: '◆', admin: true }
];

export default function RadialMenu({ user, isAdmin }) {
  const [openDesktop, setOpenDesktop] = useState(false);
  const location = useLocation();
  const filtered = items.filter(i => {
    if (i.admin && !isAdmin) return false;
    if (i.auth && !user) return false;
    return true;
  });
  const radius = 72;
  const count = filtered.length;
  const angleStep = (Math.PI * 0.85) / Math.max(1, count - 1);
  const startAngle = -Math.PI * 0.1;

  return (
    <>
      <nav className="radial-menu desktop-menu" aria-label="Навигация (desktop)">
        <AnimatePresence>
          {openDesktop && (
            <>
              {filtered.map((item, i) => {
                const angle = startAngle + angleStep * i;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/');
                return (
                  <motion.div
                    key={ item.path }
                    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                    animate={{ opacity: 1, scale: 1, x, y }}
                    exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: x, marginTop: y }}
                  >
                    <Link
                      to={item.path}
                      className={`radial-item ${isActive ? 'active' : ''}`}
                      onClick={() => setOpenDesktop(false)}
                    >
                      <span className="radial-icon">{item.icon}</span>
                      <span className="radial-label">{item.label}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </>
          )}
        </AnimatePresence>
        <motion.button
          type="button"
          className="radial-toggle"
          onClick={() => setOpenDesktop(!openDesktop)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{ rotate: openDesktop ? 90 : 0 }}
        >
          <span className="logo-text">Nova</span>
          <span className="logo-text accent">Sound</span>
        </motion.button>
      </nav>

      <style>{`
        .radial-menu {
          position: fixed;
          top: 0 !important;
          left: 0 !important;
          right: auto !important;
          bottom: auto !important;
          margin: 0 !important;
          transform: none !important;
          width: 180px;
          height: 120px;
          z-index: 130;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .radial-toggle {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          border: 2px solid var(--neon-cyan);
          background: rgba(5, 217, 232, 0.1);
          color: var(--neon-cyan);
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 0.9rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: var(--glow-cyan);
        }
        .radial-toggle .accent { color: var(--neon-pink); }
        .radial-item {
          position: absolute;
          left: 0;
          top: 0;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--bg-card);
          border: 1px solid var(--neon-purple);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text);
          font-size: 0.7rem;
          box-shadow: 0 0 15px rgba(211,0,197,0.3);
          transition: all 0.2s;
        }
        .radial-item:hover, .radial-item.active {
          border-color: var(--neon-pink);
          box-shadow: var(--glow-pink);
          color: var(--neon-pink);
        }
        .radial-icon { font-size: 1.1rem; }
        .radial-label { margin-top: 2px; }
        @media (max-width: 768px) {
          .radial-menu { width: 140px; height: 100px; }
          .radial-toggle { width: 80px; height: 80px; font-size: 0.75rem; }
        }
      `}</style>
    </>
  );
}
