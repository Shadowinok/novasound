import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

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
    if (err.response?.status === 401 || err.response?.status === 403) {
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
  me: () => client.get('/auth/me')
};

export const users = {
  deleteMe: (password) => client.delete('/users/me', { data: { password } })
};

export const tracks = {
  list: (params) => client.get('/tracks', { params }),
  get: (id) => client.get(`/tracks/${id}`),
  my: (params) => client.get('/tracks/my', { params }),
  create: (formData) => client.post('/tracks', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  createWithProgress: (formData, onProgress) => client.post('/tracks', formData, {
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
  delete: (id) => client.delete(`/tracks/${id}`),
  play: (id) => client.post(`/tracks/${id}/play`),
  like: (id) => client.post(`/tracks/${id}/like`),
  report: (id, text) => client.post(`/tracks/${id}/report`, { text })
};

export const charts = {
  weekly: () => client.get('/charts/weekly'),
  monthly: () => client.get('/charts/monthly'),
  alltime: () => client.get('/charts/alltime')
};

export const playlists = {
  list: () => client.get('/playlists'),
  get: (id) => client.get(`/playlists/${id}`),
  create: (formData) => client.post('/playlists', formData, { headers: formData instanceof FormData ? {} : { 'Content-Type': 'application/json' } }),
  update: (id, data) => {
    if (data instanceof FormData) return client.put(`/playlists/${id}`, data);
    return client.put(`/playlists/${id}`, data);
  },
  delete: (id) => client.delete(`/playlists/${id}`)
};

export const admin = {
  users: () => client.get('/admin/users'),
  deleteUser: (id, reason) => client.delete(`/admin/users/${id}`, { data: { reason } }),
  pendingTracks: () => client.get('/admin/tracks/pending'),
  approveTrack: (id, comment) => client.put(`/admin/tracks/${id}/approve`, { comment }),
  rejectTrack: (id, comment) => client.put(`/admin/tracks/${id}/reject`, { comment }),
  trackReports: (status) => client.get('/admin/track-reports', { params: { status: status || 'open' } }),
  resolveTrackReport: (reportId, action, adminComment) => client.put(`/admin/track-reports/${reportId}/resolve`, { action, adminComment })
};

export function getAudioUrl(track) {
  if (!track?.audioFileId) return '';
  const base = import.meta.env.VITE_API_URL || '';
  return `${base}/tracks/audio/${track.audioFileId}`;
}
