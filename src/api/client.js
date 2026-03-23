import axios from 'axios';

/**
 * База API. На Vercel (и dev) — относительный /api → тот же origin, прокси в vercel.json, без CORS к Render.
 * На REG.RU и т.д. — только абсолютный URL (Render). Важно: если в билде VITE_API_URL=/api для Vercel,
 * на REG.RU нельзя использовать относительный путь — статика не проксирует /api, смена обложки и логин ломаются.
 */
function getApiBase() {
  // В index.html можно задать без пересборки: window.NOVASOUND_API_BASE = 'https://.../api'
  if (typeof window !== 'undefined' && window.NOVASOUND_API_BASE) {
    return String(window.NOVASOUND_API_BASE).replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    if (h.endsWith('.vercel.app') || h === 'localhost' || h === '127.0.0.1') {
      return '/api';
    }
  }
  const env = import.meta.env.VITE_API_URL;
  const envStr = env !== undefined && env !== null ? String(env).trim() : '';
  // Абсолютный URL из env — подходит для любого домена (в т.ч. свой домен на Vercel + CORS на Render).
  if (envStr && !envStr.startsWith('/')) {
    return envStr.replace(/\/$/, '');
  }
  // Относительный /api из .env здесь не применяем: без прокси (REG.RU) он ведёт на 404 у хостинга.
  if (typeof window === 'undefined') {
    return import.meta.env.DEV ? '/api' : 'https://novasound-api.onrender.com/api';
  }
  return 'https://novasound-api.onrender.com/api';
}

const API_BASE = getApiBase();
const API_ORIGIN = API_BASE.endsWith('/api') ? API_BASE.slice(0, -4) : API_BASE;

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('novasound_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err.response?.status;
    const url = String(err.config?.url || '');
    const method = String(err.config?.method || '').toLowerCase();
    // Неверный пароль при входе тоже 401 — не считаем это «протухшим токеном», не чистим хранилище здесь
    const isFailedLogin = status === 401 && method === 'post' && url.includes('auth/login');
    // Только 401 с других эндпоинтов = токен недействителен. 403 не чистим.
    if (status === 401 && !isFailedLogin) {
      localStorage.removeItem('novasound_token');
      localStorage.removeItem('novasound_user');
      window.dispatchEvent(new Event('auth_logout'));
    }
    return Promise.reject(err);
  }
);

export default client;

export const auth = {
  register: (data) => client.post('/auth/register', data),
  login: (data) => client.post('/auth/login', data),
  me: () => client.get('/auth/me'),
  resendVerification: (email) => client.post('/auth/resend-verification', { email })
};

export const users = {
  deleteMe: (password) => client.delete('/users/me', { data: { password } })
};

export const tracks = {
  list: (params) => client.get('/tracks', { params }),
  get: (id) => client.get(`/tracks/${id}`),
  my: (params) => client.get('/tracks/my', { params }),
  myReports: () => client.get('/tracks/my/reports'),
  create: (formData) => client.post('/tracks', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  createWithProgress: (formData, onProgress) =>
    client.post('/tracks', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (!onProgress) return;
        const total = evt.total || 0;
        const loaded = evt.loaded || 0;
        const pct = total ? Math.round((loaded / total) * 100) : 0;
        onProgress({ loaded, total, pct });
      }
    }),
  update: (id, data) => client.put(`/tracks/${id}`, data),
  /**
   * Смена обложки: XMLHttpRequest + FormData (надёжнее fetch для multipart), не axios JSON.
   * URL через getApiBase() — на Vercel запрос идёт на /api (прокси), без CORS к Render.
   */
  updateCover: async (id, formData) => {
    const idStr = String(id ?? '').trim();
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('novasound_token') : null;
    const base = getApiBase().replace(/\/$/, '');
    const path = `/tracks/${encodeURIComponent(idStr)}/cover`;
    const url = `${base}${path}`;

    const { status, data } = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      // POST: часть CDN/прокси (в т.ч. Vercel edge) криво прокидывает PUT + multipart; на бэке дублирует PUT
      xhr.open('POST', url, true);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.onload = () => {
        let parsed = {};
        try {
          parsed = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        } catch (_) {
          parsed = { message: xhr.status >= 400 ? `Ошибка сервера (${xhr.status})` : '' };
        }
        resolve({ status: xhr.status, data: parsed });
      };
      xhr.onerror = () =>
        reject(new Error('Нет связи с сервером (сеть/CORS). На своём домене добавь CORS_EXTRA_ORIGINS на Render.'));
      xhr.send(formData);
    });

    if (status === 401) {
      localStorage.removeItem('novasound_token');
      localStorage.removeItem('novasound_user');
      window.dispatchEvent(new Event('auth_logout'));
    }
    if (status < 200 || status >= 300) {
      const err = new Error(data.message || 'Не удалось загрузить обложку');
      err.response = { status, data };
      throw err;
    }
    return { data };
  },
  delete: (id) => client.delete(`/tracks/${id}`),
  play: (id) => client.post(`/tracks/${id}/play`),
  like: (id) => client.post(`/tracks/${id}/like`),
  report: (id, text, reportType) =>
    client.post(`/tracks/${id}/report`, { text, ...(reportType ? { reportType } : {}) })
};

export const charts = {
  weekly: () => client.get('/charts/weekly'),
  monthly: () => client.get('/charts/monthly'),
  alltime: () => client.get('/charts/alltime')
};

export const playlists = {
  list: () => client.get('/playlists'),
  myList: () => client.get('/playlists/my/list'),
  get: (id) => client.get(`/playlists/${id}`),
  createMy: (data) => client.post('/playlists/my', data),
  updateMy: (id, data) => client.put(`/playlists/my/${id}`, data),
  deleteMy: (id) => client.delete(`/playlists/my/${id}`),
  /** Смена обложки своего плейлиста (multipart, поле cover) — POST как у треков для Vercel */
  updateMyCover: async (id, formData) => {
    const idStr = String(id ?? '').trim();
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('novasound_token') : null;
    const base = getApiBase().replace(/\/$/, '');
    const path = `/playlists/my/${encodeURIComponent(idStr)}/cover`;
    const url = `${base}${path}`;

    const { status, data } = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.onload = () => {
        let parsed = {};
        try {
          parsed = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        } catch (_) {
          parsed = { message: xhr.status >= 400 ? `Ошибка сервера (${xhr.status})` : '' };
        }
        resolve({ status: xhr.status, data: parsed });
      };
      xhr.onerror = () =>
        reject(new Error('Нет связи с сервером (сеть/CORS). На своём домене добавь CORS_EXTRA_ORIGINS на Render.'));
      xhr.send(formData);
    });

    if (status === 401) {
      localStorage.removeItem('novasound_token');
      localStorage.removeItem('novasound_user');
      window.dispatchEvent(new Event('auth_logout'));
    }
    if (status < 200 || status >= 300) {
      const err = new Error(data.message || 'Не удалось загрузить обложку');
      err.response = { status, data };
      throw err;
    }
    return { data };
  },
  addTrack: (playlistId, trackId) => client.post(`/playlists/${playlistId}/tracks/${trackId}`),
  removeTrack: (playlistId, trackId) => client.delete(`/playlists/${playlistId}/tracks/${trackId}`),
  create: async (data) => {
    if (!(data instanceof FormData)) {
      return client.post('/playlists', data, { headers: { 'Content-Type': 'application/json' } });
    }
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('novasound_token') : null;
    const base = getApiBase().replace(/\/$/, '');
    const url = `${base}/playlists`;
    const { status, data: body } = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.onload = () => {
        let parsed = {};
        try {
          parsed = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        } catch (_) {
          parsed = { message: xhr.status >= 400 ? `Ошибка сервера (${xhr.status})` : '' };
        }
        resolve({ status: xhr.status, data: parsed });
      };
      xhr.onerror = () => reject(new Error('Нет связи с сервером (сеть/CORS)'));
      xhr.send(data);
    });
    if (status < 200 || status >= 300) {
      const err = new Error(body.message || 'Не удалось создать плейлист');
      err.response = { status, data: body };
      throw err;
    }
    return { data: body };
  },
  update: (id, data) => {
    if (data instanceof FormData) {
      const idStr = String(id ?? '').trim();
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('novasound_token') : null;
      const base = getApiBase().replace(/\/$/, '');
      const url = `${base}/playlists/${encodeURIComponent(idStr)}`;
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        // POST-дубль на бэке: устойчивее для multipart, чем PUT через edge/proxy.
        xhr.open('POST', url, true);
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.onload = () => {
          let parsed = {};
          try {
            parsed = xhr.responseText ? JSON.parse(xhr.responseText) : {};
          } catch (_) {
            parsed = { message: xhr.status >= 400 ? `Ошибка сервера (${xhr.status})` : '' };
          }
          if (xhr.status >= 200 && xhr.status < 300) return resolve({ data: parsed });
          const err = new Error(parsed.message || 'Не удалось обновить плейлист');
          err.response = { status: xhr.status, data: parsed };
          reject(err);
        };
        xhr.onerror = () => reject(new Error('Нет связи с сервером (сеть/CORS)'));
        xhr.send(data);
      });
    }
    return client.put(`/playlists/${id}`, data);
  },
  delete: (id) => client.delete(`/playlists/${id}`)
};

export const admin = {
  playlists: (scope = 'editorial') => client.get('/admin/playlists', { params: { scope } }),
  syncHybridPlaylists: () => client.post('/admin/playlists/hybrid/sync'),
  users: () => client.get('/admin/users'),
  deleteUser: (id, reason) => client.delete(`/admin/users/${id}`, { data: { reason } }),
  pendingTracks: () => client.get('/admin/tracks/pending'),
  coverPending: () => client.get('/admin/tracks/cover-pending'),
  approveCover: (id) => client.put(`/admin/tracks/${id}/cover/approve`),
  rejectCoverModeration: (id, comment) => client.put(`/admin/tracks/${id}/cover/reject`, { comment }),
  approveTrack: (id, comment) => client.put(`/admin/tracks/${id}/approve`, { comment }),
  rejectTrack: (id, comment) => client.put(`/admin/tracks/${id}/reject`, { comment }),
  trackReports: (status) => client.get('/admin/track-reports', { params: { status: status || 'open' } }),
  resolveTrackReport: (reportId, action, adminComment) => client.put(`/admin/track-reports/${reportId}/resolve`, { action, adminComment })
};

/** URL стрима; для HTML5 <audio> JWT передаётся в query (?token=), заголовок туда не попадает */
export function getAudioUrl(track) {
  if (!track?.audioFileId) return '';
  const base = `${API_ORIGIN}/api/tracks/audio/${track.audioFileId}`;
  if (typeof localStorage === 'undefined') return base;
  const token = localStorage.getItem('novasound_token');
  if (!token) return base;
  return `${base}?token=${encodeURIComponent(token)}`;
}
