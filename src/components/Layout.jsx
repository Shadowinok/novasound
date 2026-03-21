import React, { useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ParticleBackground from './ParticleBackground';
import RadialMenu from './RadialMenu';
import PlayerBar from './PlayerBar';
import './Layout.css';

export default function Layout() {
  const { user, isAdmin } = useAuth();
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
      <header className="header">
        <div className="header-inner">
          <div className="auth-links">
            {user ? (
              <div className="user-box">
                <span className="user-name">{user.username}</span>
                <span className="msk-clock">MSK {mskTime}</span>
              </div>
            ) : (
              <>
                <a href="/login" className="nav-link">Вход</a>
                <a href="/register" className="nav-link">Регистрация</a>
              </>
            )}
          </div>
          <h1 className="site-title">
            <span className="neon-pink">Nova</span><span className="neon-cyan">Sound</span>
          </h1>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <RadialMenu user={user} isAdmin={isAdmin} />
      <PlayerBar />
    </div>
  );
}
