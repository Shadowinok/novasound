import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { tracks as tracksApi } from '../api/client';

export default function UploadTrack({ onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!audioFile) {
      setError('Выберите аудиофайл (MP3, WAV, OGG, M4A)');
      return;
    }
    if (title.length < 3 || title.length > 100) {
      setError('Название от 3 до 100 символов');
      return;
    }
    setError('');
    setLoading(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('audio', audioFile);
    if (coverFile) formData.append('cover', coverFile);
    tracksApi.create(formData)
      .then(() => onSuccess())
      .catch((err) => setError(err.response?.data?.message || 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  };

  return (
    <motion.div
      className="upload-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
    >
      <motion.div
        className="upload-modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="upload-title">Загрузить трек</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Название (3–100 символов)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={3}
            maxLength={100}
            className="upload-input"
          />
          <textarea
            placeholder="Описание"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="upload-input"
          />
          <label className="upload-label">Аудио (MP3, WAV, OGG, M4A) *</label>
          <input
            type="file"
            accept=".mp3,.wav,.ogg,.m4a"
            onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
            className="upload-file"
          />
          <label className="upload-label">Обложка (JPG, PNG)</label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
            className="upload-file"
          />
          {error && <div className="upload-error">{error}</div>}
          <div className="upload-actions">
            <button type="button" className="upload-cancel" onClick={onClose}>Отмена</button>
            <button type="submit" disabled={loading} className="upload-submit">Загрузить</button>
          </div>
        </form>
      </motion.div>
      <style>{`
        .upload-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 24px;
        }
        .upload-modal {
          background: var(--bg-card);
          border: 1px solid var(--neon-cyan);
          border-radius: 16px;
          padding: 28px;
          max-width: 420px;
          width: 100%;
          box-shadow: 0 0 50px rgba(5, 217, 232, 0.2);
        }
        .upload-title { color: var(--neon-cyan); margin-bottom: 20px; }
        .upload-input, .upload-file {
          width: 100%;
          padding: 10px 14px;
          margin-bottom: 12px;
          border: 1px solid rgba(5, 217, 232, 0.4);
          border-radius: 8px;
          background: rgba(0,0,0,0.3);
          color: var(--text);
        }
        .upload-label { display: block; margin-bottom: 4px; font-size: 0.9rem; color: var(--text-dim); }
        .upload-error { color: #ff6b6b; margin-bottom: 12px; font-size: 0.9rem; }
        .upload-actions { display: flex; gap: 12px; margin-top: 20px; }
        .upload-cancel {
          padding: 10px 20px;
          border: 1px solid var(--text-dim);
          background: transparent;
          color: var(--text-dim);
          border-radius: 8px;
        }
        .upload-submit {
          padding: 10px 24px;
          border: 2px solid var(--neon-pink);
          background: rgba(255, 42, 109, 0.2);
          color: var(--neon-pink);
          border-radius: 8px;
          font-weight: 600;
        }
      `}</style>
    </motion.div>
  );
}
