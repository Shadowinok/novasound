import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import YandexMetrika from './components/YandexMetrika';
import GlobalToast from './components/GlobalToast';
import { AuthProvider } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
import { ToastProvider } from './context/ToastContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <YandexMetrika />
      <AuthProvider>
        <ToastProvider>
          <PlayerProvider>
            <App />
            <GlobalToast />
          </PlayerProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
