import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ParticleBackground from './ParticleBackground';
import RadialMenu from './RadialMenu';
import PlayerBar from './PlayerBar';
import './Layout.css';

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();

  return (
    <div className="layout">
      <ParticleBackground />
      <header className="header">
        <div className="header-inner">
          <div className="auth-links">
            {user ? (
              <>
                <span className="user-name">{user.username}</span>
                <button type="button" className="nav-link logout-btn" onClick={logout}>Выйти</button>
              </>
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
