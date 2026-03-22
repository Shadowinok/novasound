import React from 'react';
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

function PrivateRoute({ children, admin }) {
  const token = localStorage.getItem('novasound_token');
  const user = JSON.parse(localStorage.getItem('novasound_user') || 'null');
  if (!token || !user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
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
        <Route path="profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="admin" element={<PrivateRoute admin><Admin /></PrivateRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
