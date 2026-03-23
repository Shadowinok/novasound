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
  const radius = 92;
  const count = filtered.length;
  const angleStep = (Math.PI * 0.5) / Math.max(1, count - 1);
  const startAngle = Math.PI * 0.08;
  const itemSize = 50;
  const half = itemSize / 2;
  const toggleSize = 82;
  const toggleCenter = toggleSize / 2;

  return (
    <nav className="radial-menu" aria-label="Основная навигация">
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
                  key={item.path}
                  className="radial-menu-node"
                  initial={{ opacity: 0, scale: 0.7, x: 0, y: 0 }}
                  animate={{ opacity: 1, scale: 1, x, y }}
                  exit={{ opacity: 0, scale: 0.7, x: 0, y: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                  style={{
                    position: 'absolute',
                    left: toggleCenter,
                    top: toggleCenter,
                    width: itemSize,
                    height: itemSize,
                    marginLeft: -half,
                    marginTop: -half,
                    zIndex: 2
                  }}
                >
                  <Link
                    to={item.path}
                    className={`radial-item ${isActive ? 'active' : ''}`}
                    onClick={() => setOpen(false)}
                    title={item.label}
                    aria-label={item.label}
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
          top: calc(16px + env(safe-area-inset-top, 0px));
          left: 16px;
          z-index: 120;
          width: min(78vw, 260px);
          height: min(62vh, 260px);
          pointer-events: none;
        }
        .radial-menu .radial-toggle,
        .radial-menu .radial-menu-node { pointer-events: auto; }
        .radial-toggle {
          width: 82px;
          height: 82px;
          border-radius: 50%;
          border: 2px solid var(--neon-cyan);
          background: rgba(5, 217, 232, 0.12);
          color: var(--neon-cyan);
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 0.74rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: var(--glow-cyan);
          position: relative;
          z-index: 1;
        }
        .radial-toggle .accent { color: var(--neon-pink); }
        .radial-item {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 1px solid var(--neon-purple);
          background: var(--bg-card);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text);
          text-decoration: none;
          font-size: 0.68rem;
          transition: all 0.2s;
          box-shadow: 0 0 15px rgba(211, 0, 197, 0.3);
          text-align: center;
          padding: 4px;
        }
        .radial-item:hover, .radial-item.active {
          border-color: var(--neon-pink);
          box-shadow: var(--glow-pink);
          color: var(--neon-pink);
        }
        .radial-icon {
          font-size: 1.05rem;
          line-height: 1;
        }
        .radial-label {
          margin-top: 2px;
          font-size: 0.6rem;
          line-height: 1.1;
        }

        @media (max-width: 768px) {
          .radial-menu {
            top: calc(10px + env(safe-area-inset-top, 0px));
            left: 10px;
            width: min(86vw, 230px);
            height: min(56vh, 230px);
          }
          .radial-toggle {
            width: 74px;
            height: 74px;
            font-size: 0.68rem;
          }
          .radial-item {
            font-size: 0.64rem;
          }
          .radial-icon {
            font-size: 0.95rem;
          }
        }
        @media (orientation: landscape) and (max-height: 500px) {
          .radial-menu {
            width: 210px;
            height: 190px;
          }
          .radial-toggle {
            width: 68px;
            height: 68px;
            font-size: 0.64rem;
          }
        }
      `}</style>
    </nav>
  );
}
