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
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const filtered = items.filter(i => {
    if (i.admin && !isAdmin) return false;
    if (i.auth && !user) return false;
    return true;
  });
  /** Дуга раскрытия в правый-нижний сектор, чтобы в левом верхнем углу ничего не обрезалось. */
  const radius = 96;
  const count = filtered.length;
  const angleStep = (Math.PI * 0.36) / Math.max(1, count - 1);
  const startAngle = Math.PI * 0.08;
  const itemSize = 48;
  const half = itemSize / 2;

  return (
    <nav
      className="radial-menu"
      aria-label="Основная навигация"
    >
      <AnimatePresence>
        {open && (
          <>
            {filtered.map((item, i) => {
              const angle = startAngle + angleStep * i;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/');
              return (
                <motion.div
                  key={ item.path }
                  className="radial-menu-node"
                  initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                  animate={{ opacity: 1, scale: 1, x, y }}
                  exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: itemSize,
                    height: itemSize,
                    marginLeft: -half,
                    marginTop: -half
                  }}
                >
                  <Link
                    to={item.path}
                    className={`radial-item ${isActive ? 'active' : ''}`}
                    onClick={() => setOpen(false)}
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
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{ rotate: open ? 90 : 0 }}
      >
        <span className="logo-text">Nova</span>
        <span className="logo-text accent">Sound</span>
      </motion.button>
      <style>{`
        .radial-menu {
          position: fixed;
          top: calc(10px + env(safe-area-inset-top, 0px));
          left: 10px;
          width: min(92vw, 240px);
          height: min(80vh, 240px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        .radial-menu .radial-toggle,
        .radial-menu .radial-menu-node {
          pointer-events: auto;
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
          .radial-menu {
            left: 8px;
            top: calc(8px + env(safe-area-inset-top, 0px));
            width: min(95vw, 220px);
            height: min(68vh, 220px);
          }
          .radial-toggle { width: 80px; height: 80px; font-size: 0.75rem; }
        }
        @media (orientation: landscape) and (max-height: 500px) {
          .radial-menu {
            width: 200px;
            height: 180px;
          }
          .radial-toggle {
            width: 72px;
            height: 72px;
            font-size: 0.7rem;
          }
        }
      `}</style>
    </nav>
  );
}
