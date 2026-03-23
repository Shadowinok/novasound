import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
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

/** Минимальный зазор между кружками (край к краю), px */
const GAP_MIN_PX = 3;
/** Отступ от краёв окна при проверке вписывания (адаптив веера) */
const SCREEN_PAD = 5;

/**
 * Отступ контейнера меню от угла layout-shell — слева и сверху одинаково.
 */
const MENU_INSET_PX = 10;

function fanFitsViewport(px, py, n, d, R, startAngle, deltaTheta, vw, vh, pad) {
  const r = d / 2;
  for (let i = 0; i < n; i++) {
    const th = startAngle + i * deltaTheta;
    const cx = px + R * Math.cos(th);
    const cy = py + R * Math.sin(th);
    if (cx - r < pad || cx + r > vw - pad) return false;
    if (cy - r < pad || cy + r > vh - pad) return false;
  }
  return true;
}

function fanOverflow(px, py, n, d, R, startAngle, deltaTheta, vw, vh, pad) {
  const r = d / 2;
  let overflow = 0;
  for (let i = 0; i < n; i++) {
    const th = startAngle + i * deltaTheta;
    const cx = px + R * Math.cos(th);
    const cy = py + R * Math.sin(th);
    overflow += Math.max(0, pad - (cx - r));
    overflow += Math.max(0, (cx + r) - (vw - pad));
    overflow += Math.max(0, pad - (cy - r));
    overflow += Math.max(0, (cy + r) - (vh - pad));
  }
  return overflow;
}

function fanMinTopLeft(px, py, n, d, R, startAngle, deltaTheta) {
  const r = d / 2;
  let minTop = Number.POSITIVE_INFINITY;
  let minLeft = Number.POSITIVE_INFINITY;
  for (let i = 0; i < n; i++) {
    const th = startAngle + i * deltaTheta;
    const cx = px + R * Math.cos(th);
    const cy = py + R * Math.sin(th);
    minTop = Math.min(minTop, cy - r);
    minLeft = Math.min(minLeft, cx - r);
  }
  return { minTop, minLeft };
}

/**
 * Подбираем дугу и минимальный R по зазору между соседями (хорда = d + gap),
 * затем пробуем несколько длин луча (R), чтобы меню полностью влезало в экран.
 */
function computeFanLayout({ n, d, px, py, vw, vh, pad, startAngleBase }) {
  if (n <= 1) {
    return { radius: 72, angleStep: 0.2, arcSpan: Math.PI * 0.4, startAngle: startAngleBase };
  }
  const cMin = d + GAP_MIN_PX;
  const padEff = pad;
  // Поворачиваем веер в более широком и более плавном диапазоне.
  const angleOffsets = [];
  for (let s = -14; s <= 14; s++) angleOffsets.push((s * 0.04) * Math.PI);
  // Луч можно увеличивать, если это нужно чтобы держать экранные отступы.
  const radiusMultipliers = [1, 1.04, 1.08, 1.12, 1.16, 1.2, 1.26, 1.32, 1.4, 1.5];
  let bestFit = null;
  let bestAny = null;

  const isBetterFit = (a, b) => {
    if (!b) return true;
    // Сначала одновременно держим верх и лево (минимизируем худшую ошибку).
    const aMaxErr = Math.max(a.topError, a.leftError);
    const bMaxErr = Math.max(b.topError, b.leftError);
    if (Math.abs(aMaxErr - bMaxErr) > 1e-9) return aMaxErr < bMaxErr;
    // Затем улучшаем каждую ошибку отдельно.
    if (Math.abs(a.topError - b.topError) > 1e-9) return a.topError < b.topError;
    if (Math.abs(a.leftError - b.leftError) > 1e-9) return a.leftError < b.leftError;
    // После якорей — компактность.
    if (Math.abs(a.gapExtra - b.gapExtra) > 1e-9) return a.gapExtra < b.gapExtra;
    if (Math.abs(a.radius - b.radius) > 1e-3) return a.radius < b.radius;
    if (Math.abs(a.angleOffsetAbs - b.angleOffsetAbs) > 1e-9) return a.angleOffsetAbs < b.angleOffsetAbs;
    return a.arcSpan < b.arcSpan;
  };

  const isBetterAny = (a, b) => {
    if (!b) return true;
    if (Math.abs(a.overflow - b.overflow) > 1e-9) return a.overflow < b.overflow;
    if (Math.abs(a.topError - b.topError) > 1e-9) return a.topError < b.topError;
    if (Math.abs(a.leftError - b.leftError) > 1e-9) return a.leftError < b.leftError;
    if (Math.abs(a.gapExtra - b.gapExtra) > 1e-9) return a.gapExtra < b.gapExtra;
    return a.radius < b.radius;
  };

  for (let k = 0; k < 140; k++) {
    const arcSpan = (0.32 + k * 0.012) * Math.PI;
    if (arcSpan > 2.08 * Math.PI) break;
    const deltaTheta = arcSpan / (n - 1);
    const sh = Math.sin(deltaTheta / 2);
    if (sh < 1e-7) continue;
    const minR = cMin / (2 * sh);
    if (!(minR > 0)) continue;

    for (let a = 0; a < angleOffsets.length; a++) {
      const angleOffset = angleOffsets[a];
      const startAngle = startAngleBase + angleOffset;
      for (let i = 0; i < radiusMultipliers.length; i++) {
        const R = minR * radiusMultipliers[i];
        const fits = fanFitsViewport(px, py, n, d, R, startAngle, deltaTheta, vw, vh, padEff);
        const overflow = fanOverflow(px, py, n, d, R, startAngle, deltaTheta, vw, vh, padEff);
        const { minTop, minLeft } = fanMinTopLeft(px, py, n, d, R, startAngle, deltaTheta);
        const topError = Math.abs(minTop - padEff);
        const leftError = Math.abs(minLeft - padEff);
        const gapNow = 2 * R * sh - d;
        const gapExtra = Math.max(0, gapNow - GAP_MIN_PX);
        const candidate = {
          radius: R,
          angleStep: deltaTheta,
          arcSpan,
          startAngle,
          overflow,
          topError,
          leftError,
          gapExtra,
          angleOffsetAbs: Math.abs(angleOffset)
        };

        if (fits && isBetterFit(candidate, bestFit)) {
          bestFit = candidate;
        }
        if (isBetterAny(candidate, bestAny)) {
          bestAny = candidate;
        }
      }
    }
  }
  if (bestFit) {
    return { radius: bestFit.radius, angleStep: bestFit.angleStep, arcSpan: bestFit.arcSpan, startAngle: bestFit.startAngle };
  }
  if (bestAny) {
    return { radius: bestAny.radius, angleStep: bestAny.angleStep, arcSpan: bestAny.arcSpan, startAngle: bestAny.startAngle };
  }

  const arcSpan = Math.PI * 0.9;
  const deltaTheta = arcSpan / (n - 1);
  return { radius: 96, angleStep: deltaTheta, arcSpan, startAngle: startAngleBase };
}

export default function RadialMenu({ user, isAdmin }) {
  const [openDesktop, setOpenDesktop] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const [layout, setLayout] = useState(() => ({
    vw: typeof window !== 'undefined' ? window.innerWidth : 1200,
    vh: typeof window !== 'undefined' ? window.innerHeight : 800,
    desktopPx: 115,
    desktopPy: 64,
    mobilePx: 83,
    mobilePy: 74
  }));

  const desktopRef = useRef(null);
  const mobileRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const apply = () => setIsNarrow(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const measurePivots = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setLayout((prev) => {
      const next = { ...prev, vw, vh };
      if (desktopRef.current) {
        const r = desktopRef.current.getBoundingClientRect();
        if (r.width >= 4 && r.height >= 4) {
          next.desktopPx = r.left + r.width / 2;
          next.desktopPy = r.top + r.height / 2;
        }
      }
      if (mobileRef.current) {
        const r = mobileRef.current.getBoundingClientRect();
        if (r.width >= 4 && r.height >= 4) {
          next.mobilePx = r.left + r.width / 2;
          next.mobilePy = r.top + r.height / 2;
        }
      }
      return next;
    });
  };

  useLayoutEffect(() => {
    measurePivots();
    window.addEventListener('resize', measurePivots);
    window.addEventListener('scroll', measurePivots, true);
    return () => {
      window.removeEventListener('resize', measurePivots);
      window.removeEventListener('scroll', measurePivots, true);
    };
  }, [isNarrow]);

  const filtered = items.filter(i => {
    if (i.admin && !isAdmin) return false;
    if (i.auth && !user) return false;
    return true;
  });
  const count = filtered.length;
  const startAngleBase = -Math.PI * 0.1;

  const deskItemSize = 48;
  const deskHalf = deskItemSize / 2;
  const mobItemSize = 44;
  const mobHalf = mobItemSize / 2;

  const desktopGeom = useMemo(
    () =>
      computeFanLayout({
        n: count,
        d: deskItemSize,
        px: layout.desktopPx,
        py: layout.desktopPy,
        vw: layout.vw,
        vh: layout.vh,
        pad: SCREEN_PAD,
        startAngleBase
      }),
    [count, layout.vw, layout.vh, layout.desktopPx, layout.desktopPy]
  );

  const mobileGeom = useMemo(
    () =>
      computeFanLayout({
        n: count,
        d: mobItemSize,
        px: layout.mobilePx,
        py: layout.mobilePy,
        vw: layout.vw,
        vh: layout.vh,
        pad: SCREEN_PAD,
        startAngleBase
      }),
    [count, layout.vw, layout.vh, layout.mobilePx, layout.mobilePy]
  );

  return (
    <>
      <nav
        ref={desktopRef}
        className="radial-menu radial-menu--desktop"
        aria-label="Навигация (desktop)"
      >
        <AnimatePresence>
          {openDesktop && (
            <>
              {filtered.map((item, i) => {
                const angle = desktopGeom.startAngle + desktopGeom.angleStep * i;
                const x = Math.cos(angle) * desktopGeom.radius;
                const y = Math.sin(angle) * desktopGeom.radius;
                const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/');
                return (
                  <motion.div
                    key={`d-${item.path}`}
                    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                    animate={{ opacity: 1, scale: 1, x, y }}
                    exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: deskItemSize,
                      height: deskItemSize,
                      marginLeft: -deskHalf,
                      marginTop: -deskHalf
                    }}
                  >
                    <Link
                      to={item.path}
                      className={`radial-item radial-item--desktop ${isActive ? 'active' : ''}`}
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
          className="radial-toggle radial-toggle--desktop"
          onClick={() => setOpenDesktop(!openDesktop)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{ rotate: openDesktop ? 90 : 0 }}
        >
          <span className="logo-text">Nova</span>
          <span className="logo-text accent">Sound</span>
        </motion.button>
      </nav>

      <nav
        ref={mobileRef}
        className="radial-menu radial-menu--mobile"
        aria-label="Навигация (mobile)"
      >
        <AnimatePresence>
          {openMobile && (
            <>
              {filtered.map((item, i) => {
                const angle = mobileGeom.startAngle + mobileGeom.angleStep * i;
                const x = Math.cos(angle) * mobileGeom.radius;
                const y = Math.sin(angle) * mobileGeom.radius;
                const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/');
                return (
                  <motion.div
                    key={`m-${item.path}`}
                    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                    animate={{ opacity: 1, scale: 1, x, y }}
                    exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: mobItemSize,
                      height: mobItemSize,
                      marginLeft: -mobHalf,
                      marginTop: -mobHalf
                    }}
                  >
                    <Link
                      to={item.path}
                      className={`radial-item radial-item--mobile ${isActive ? 'active' : ''}`}
                      onClick={() => setOpenMobile(false)}
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
          className="radial-toggle radial-toggle--mobile"
          onClick={() => setOpenMobile(!openMobile)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{ rotate: openMobile ? 90 : 0 }}
        >
          <span className="logo-text">Nova</span>
          <span className="logo-text accent">Sound</span>
        </motion.button>
      </nav>

      <style>{`
        .radial-menu {
          position: absolute;
          margin: 0 !important;
          transform: none !important;
          z-index: 130;
          /* Кнопка в углу контейнера — центр веера = центр кнопки, без лишнего сдвига */
          display: flex;
          align-items: flex-start;
          justify-content: flex-start;
          overflow: visible;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        /*
          Расстояние до меню (до левого верхнего угла блока nav):
          • Десктоп: MENU_INSET_PX слева и сверху.
          • Мобилка: то же + safe-area.
          Центр веера = центр кнопки (половина размера контейнера от угла блока).
        */
        .radial-menu--desktop {
          top: ${MENU_INSET_PX}px !important;
          left: ${MENU_INSET_PX}px !important;
          right: auto !important;
          bottom: auto !important;
          width: 100px;
          height: 100px;
        }

        .radial-menu--mobile {
          top: calc(${MENU_INSET_PX}px + env(safe-area-inset-top, 0px)) !important;
          left: calc(${MENU_INSET_PX}px + env(safe-area-inset-left, 0px)) !important;
          right: auto !important;
          width: 80px;
          height: 80px;
          min-height: 0;
        }

        @media (min-width: 769px) {
          .radial-menu--mobile { display: none !important; }
        }
        @media (max-width: 768px) {
          .radial-menu--desktop { display: none !important; }
        }

        .radial-toggle {
          border-radius: 50%;
          border: 2px solid var(--neon-cyan);
          background: rgba(5, 217, 232, 0.1);
          color: var(--neon-cyan);
          font-family: var(--font-display);
          font-weight: 700;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: var(--glow-cyan);
        }
        .radial-toggle--desktop {
          width: 100px;
          height: 100px;
          font-size: 0.9rem;
        }
        .radial-toggle--mobile {
          width: 80px;
          height: 80px;
          font-size: 0.75rem;
        }
        .radial-toggle .accent { color: var(--neon-pink); }

        .radial-item {
          position: absolute;
          left: 0;
          top: 0;
          box-sizing: border-box;
          border-radius: 50%;
          background: var(--bg-card);
          border: 1px solid var(--neon-purple);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text);
          box-shadow: 0 0 15px rgba(211,0,197,0.3);
          transition: all 0.2s;
        }
        .radial-item--desktop {
          width: 48px;
          height: 48px;
          font-size: 0.7rem;
        }
        .radial-item--mobile {
          width: 44px;
          height: 44px;
          font-size: 0.65rem;
        }
        .radial-item:hover, .radial-item.active {
          border-color: var(--neon-pink);
          box-shadow: var(--glow-pink);
          color: var(--neon-pink);
        }
        .radial-item--desktop .radial-icon { font-size: 1.1rem; }
        .radial-item--mobile .radial-icon { font-size: 1rem; }
        .radial-label { margin-top: 2px; }
        .radial-item--mobile .radial-label {
          font-size: 0.58rem;
          max-width: 40px;
          overflow: hidden;
          text-overflow: clip;
          line-height: 1.05;
          margin-top: 1px;
        }
      `}</style>
    </>
  );
}
