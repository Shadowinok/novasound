import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import TrackPage from './pages/TrackPage';
import Charts from './pages/Charts';
import Playlists from './pages/Playlists';
import PlaylistPage from './pages/PlaylistPage';
import Login from './pages/Login';
import Register from './pages/Register';
import RegisterCheckEmail from './pages/RegisterCheckEmail';
import VerifyEmail from './pages/VerifyEmail';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Terms from './pages/Terms';
import About from './pages/About';
import Radio from './pages/Radio';
import Chat from './pages/Chat';

function PrivateRoute({ children, admin }) {
  const token = localStorage.getItem('novasound_token');
  const user = JSON.parse(localStorage.getItem('novasound_user') || 'null');
  if (!token || !user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    (async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setBackgroundColor({ color: '#0a0a0f' });
        await StatusBar.setStyle({ style: Style.Dark });
      } catch (_) {}
      if (!cancelled) await SplashScreen.hide().catch(() => {});
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="catalog" element={<Catalog />} />
        <Route path="track/:id" element={<TrackPage />} />
        <Route path="charts" element={<Charts />} />
        <Route path="playlists" element={<Playlists />} />
        <Route path="playlist/:id" element={<PlaylistPage />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="register/check-email" element={<RegisterCheckEmail />} />
        <Route path="verify-email" element={<VerifyEmail />} />
        <Route path="terms" element={<Terms />} />
        <Route path="about" element={<About />} />
        <Route path="radio" element={<Radio />} />
        <Route path="chat" element={<Chat />} />
        <Route path="profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="admin" element={<PrivateRoute admin><Admin /></PrivateRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
