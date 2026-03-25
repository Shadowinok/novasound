import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ParticleBackground from './ParticleBackground';
import RadialMenu from './RadialMenu';
import PlayerBar from './PlayerBar';
import RadioHost from './RadioHost';
import './Layout.css';

export default function Layout() {
  const { user, isAdmin } = useAuth();
  const { pathname } = useLocation();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const mskTime = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(now));
    } catch {
      return new Date(now).toLocaleTimeString('ru-RU');
    }
  }, [now]);

  return (
    <div className="layout">
      <ParticleBackground />
      <div className="layout-shell">
        <RadialMenu user={user} isAdmin={isAdmin} />
        <header className="header">
          <div className="header-inner">
            <div className="header-spacer" aria-hidden="true" />
            <div className="header-center">
              {!user ? (
                <div className="auth-links">
                  <a href="/login" className="nav-link">Вход</a>
                  <a href="/register" className="nav-link">Регистрация</a>
                </div>
              ) : (
                <span className="user-name">{user.username}</span>
              )}
            </div>
            <div className="header-brand">
              <h1 className="site-title">
                <span className="neon-pink">Nova</span><span className="neon-cyan">Sound</span>
              </h1>
              <span className="msk-clock">MSK {mskTime}</span>
            </div>
          </div>
        </header>
        <main className="main">
          <Outlet />
        </main>
      </div>
      <PlayerBar />
      <RadioHost />
      <footer className="site-footer site-footer--dock" aria-label="Служебные ссылки">
        {pathname !== '/about' && <Link to="/about">О проекте</Link>}
        {pathname !== '/terms' && <Link to="/terms">Правила</Link>}
      </footer>
    </div>
  );
}
