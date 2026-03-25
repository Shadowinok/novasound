import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import client from '../api/client';
import { tracks as tracksApi } from '../api/client';
import { usePlayer } from '../context/PlayerContext';

/**
 * Этап 0 из docs/развитие радио.md — честный статус без фейкового «эфира»
 */
export default function Radio() {
  const {
    loadTrack, currentTrack, queue, queueIndex, isRadioMode, playing, volume, setPlayerVolume
  } = usePlayer();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [radio, setRadio] = useState({ now: null, next: [], history: [], queue: [], nowOffsetSec: 0 });
  const [hostNews, setHostNews] = useState([]);
  const [hostSchedule, setHostSchedule] = useState({
    mode: 'fixed',
    fixedEverySongs: 2,
    randomMinSongs: 2,
    randomMaxSongs: 5
  });
  const hostTimerRef = useRef(null);
  const lastSpokenKeyRef = useRef('');
  const ttsAudioRef = useRef(null);
  const hostPlayingRef = useRef(false);
  const restoreVolumeRef = useRef(null);
  const spokenTitlesRef = useRef([]);
  const hostTrackCounterRef = useRef(0);
  const lastCountedTrackKeyRef = useRef('');
  const hostNextAfterTracksRef = useRef(2);

  const activeNow = isRadioMode && currentTrack ? currentTrack : radio.now;
  const activeNext = isRadioMode && Array.isArray(queue) && queue.length
    ? queue.slice(queueIndex + 1, queueIndex + 6)
    : radio.next;
  const nextTrack = Array.isArray(activeNext) && activeNext.length ? activeNext[0] : null;
  const currentTrackId = currentTrack?._id ? String(currentTrack._id) : '';

  const loadRadio = useCallback(async (opts = {}) => {
    const resyncPlayback = Boolean(opts.resyncPlayback);
    setLoading(true);
    setError('');
    try {
      const { data } = await tracksApi.radioNow({ limit: 30 });
      const nextRadio = {
        now: data?.now || null,
        next: Array.isArray(data?.next) ? data.next : [],
        history: Array.isArray(data?.history) ? data.history : [],
        queue: Array.isArray(data?.queue) ? data.queue : [],
        nowOffsetSec: Number(data?.nowOffsetSec) || 0
      };
      setRadio(nextRadio);

      if (resyncPlayback && nextRadio.now && nextRadio.queue.length) {
        loadTrack(nextRadio.now, {
          queue: nextRadio.queue,
          startIndex: 0,
          isRadio: true,
          startAtSec: nextRadio.nowOffsetSec
        });
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'Не удалось загрузить эфир');
    } finally {
      setLoading(false);
    }
  }, [loadTrack]);

  useEffect(() => {
    loadRadio();
  }, [loadRadio]);

  const loadHostNews = useCallback(async () => {
    try {
      const { data } = await client.get('/announcements', { params: { limit: 30 } });
      setHostNews(Array.isArray(data?.items) ? data.items : []);
    } catch (_) {
      // молча игнорируем — ведущий просто не говорит
    }
  }, []);

  useEffect(() => {
    loadHostNews();
    hostTimerRef.current = window.setInterval(loadHostNews, 60000);
    return () => {
      if (hostTimerRef.current) window.clearInterval(hostTimerRef.current);
    };
  }, [loadHostNews]);

  const loadHostSettings = useCallback(async () => {
    try {
      const { data } = await client.get('/announcements/host-settings');
      const mode = data?.mode === 'random' ? 'random' : 'fixed';
      const fixedEverySongs = Math.max(1, Math.min(20, Number(data?.fixedEverySongs) || 2));
      const randomMinSongs = Math.max(1, Math.min(20, Number(data?.randomMinSongs) || 2));
      const randomMaxSongsRaw = Math.max(1, Math.min(20, Number(data?.randomMaxSongs) || 5));
      const randomMaxSongs = Math.max(randomMinSongs, randomMaxSongsRaw);
      setHostSchedule({ mode, fixedEverySongs, randomMinSongs, randomMaxSongs });
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadHostSettings();
    const id = window.setInterval(loadHostSettings, 60000);
    return () => window.clearInterval(id);
  }, [loadHostSettings]);

  useEffect(() => {
    if (hostSchedule.mode === 'random') {
      const min = Math.max(1, Number(hostSchedule.randomMinSongs) || 2);
      const max = Math.max(min, Number(hostSchedule.randomMaxSongs) || 5);
      hostNextAfterTracksRef.current = Math.floor(min + Math.random() * (max - min + 1));
      return;
    }
    hostNextAfterTracksRef.current = Math.max(1, Number(hostSchedule.fixedEverySongs) || 2);
  }, [hostSchedule]);

  const hostCandidates = useMemo(() => {
    const items = Array.isArray(hostNews) ? hostNews : [];
    const allowedKinds = new Set([
      'ai-news',
      'ai-music-news',
      'ai-creative-news',
      'gaming-news',
      'film-news',
      'industry-news',
      'software-news',
      'robots-news',
      'releases-news',
      'announcement'
    ]);
    return items.filter((it) => allowedKinds.has(it?.kind) && !!it?.title);
  }, [hostNews]);

  const detectLangHint = (text) => {
    const t = String(text || '').toLowerCase();
    if (t.includes('чуваш')) return { label: 'чувашском', langCode: 'cv-RU' };
    if (t.includes('татар')) return { label: 'татарском', langCode: 'tt-RU' };
    if (t.includes('удмурт')) return { label: 'удмуртском', langCode: 'ud-RU' };
    if (t.includes('англий')) return { label: 'английском', langCode: 'en-US' };
    return null;
  };

  const transcribeNickToSpokenRu = (nick) => {
    const s = String(nick || '').trim();
    if (!s) return s;
    if (/[А-Яа-яЁё]/.test(s)) return s.toUpperCase();
    const map = {
      A: 'А', B: 'Б', C: 'С', D: 'Д', E: 'Е', F: 'Ф', G: 'Г', H: 'Х', I: 'И', J: 'Й',
      K: 'К', L: 'Л', M: 'М', N: 'Н', O: 'О', P: 'П', Q: 'КУ', R: 'Р', S: 'С',
      T: 'Т', U: 'У', V: 'В', W: 'В', X: 'КС', Y: 'Ы', Z: 'З'
    };
    const up = s.toUpperCase();
    const out = up
      .split('')
      .map((ch) => map[ch] || '')
      .join('');
    return out || s;
  };

  const scoreHostTitle = (title) => {
    const t = String(title || '');
    const lt = t.toLowerCase();
    let s = 0;
    if (/[0-9]/.test(t)) s += 18;
    if (lt.includes('ни одна') || lt.includes('не знает') || lt.includes('не понимает')) s += 30;
    if (lt.includes('протест') || lt.includes('провер') || lt.includes('тест')) s += 22;
    if (lt.includes('скоро') || lt.includes('замен') || lt.includes('вместо')) s += 14;
    if (lt.includes('чуваш') || lt.includes('татар') || lt.includes('удмурт')) s += 30;
    if (lt.includes('графит') || lt.includes('граффит')) s -= 40;
    if (lt.includes('наркот') || lt.includes('пропаганд')) s -= 100;
    return s;
  };

  const speakLine = (text) => {
    if (!text) return Promise.resolve(false);
    const voicePool = ['ru-RU-DmitryNeural', 'ru-RU-MaximNeural', 'ru-RU-PavelNeural'];
    const tryVoice = (idx) => {
      if (idx >= voicePool.length) return Promise.resolve(false);
      return client.get('/announcements/tts', {
        params: {
          text,
          voice: voicePool[idx],
          rate: '-2%'
        },
        responseType: 'blob'
      }).then(({ data }) => {
        if (!(data instanceof Blob)) return tryVoice(idx + 1);
        const blobUrl = URL.createObjectURL(data);
        return new Promise((resolve) => {
          try {
            if (ttsAudioRef.current) {
              try { ttsAudioRef.current.pause(); } catch (_) {}
              ttsAudioRef.current = null;
            }
            const audio = new Audio(blobUrl);
            ttsAudioRef.current = audio;
            audio.onended = () => {
              URL.revokeObjectURL(blobUrl);
              resolve(true);
            };
            audio.onerror = () => {
              URL.revokeObjectURL(blobUrl);
              resolve(false);
            };
            audio.play().catch(() => {
              URL.revokeObjectURL(blobUrl);
              resolve(false);
            });
          } catch (_) {
            URL.revokeObjectURL(blobUrl);
            resolve(false);
          }
        });
      }).catch(() => tryVoice(idx + 1));
    };
    return tryVoice(0);
  };

  const hasVoiceForLang = (langCode) => {
    if (!langCode) return false;
    if (!('speechSynthesis' in window)) return false;
    const voices = window.speechSynthesis.getVoices?.() || [];
    if (!voices.length) return false;
    const target = String(langCode).toLowerCase();
    return voices.some((v) => String(v.lang || '').toLowerCase().startsWith(target.split('-')[0]));
  };

  const speakHostForTrack = useCallback(async () => {
    if (!isRadioMode) return;
    if (!playing) return;
    if (!activeNow) return;
    if (!nextTrack) return;
    if (!hostCandidates.length) return;
    const trackKey = `${currentTrackId}`;
    if (!trackKey) return;
    if (lastSpokenKeyRef.current === trackKey && hostPlayingRef.current) return;

    const spoken = spokenTitlesRef.current;
    const sorted = [...hostCandidates].sort((a, b) => scoreHostTitle(b.title) - scoreHostTitle(a.title));
    const best = sorted.find((x) => {
      const title = String(x?.title || '');
      return title && !spoken.includes(title);
    }) || sorted[0] || hostCandidates[0];
    if (!best?.title) return;
    lastSpokenKeyRef.current = trackKey;

    const langHint = detectLangHint(best.title);
    const langAvailable = langHint ? hasVoiceForLang(langHint.langCode) : false;

    const nextTitle = nextTrack.title || 'следующая песня';
    const nextAuthorRaw = nextTrack.author?.username || '—';
    const nextAuthorSpoken = transcribeNickToSpokenRu(nextAuthorRaw);
    const announcement = `Следующая песня: ${nextTitle}. Автор: ${nextAuthorSpoken}.`;

    const title = String(best.title).slice(0, 120);

    const randPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const classifyNews = (t) => {
      const lt = String(t || '').toLowerCase();
      if (lt.includes('ни одна') || lt.includes('не знает') || lt.includes('не понимает')) return 'test-absurd';
      if (lt.includes('тест') || lt.includes('провер') || lt.includes('протест')) return 'test';
      if (lt.includes('скоро') || lt.includes('замен') || lt.includes('вместо') || lt.includes('выйдет')) return 'soon-replace';
      if (langHint) return 'language';
      return 'generic';
    };

    const kind = classifyNews(title);

    const introTemplates = {
      'test-absurd': [
        'Слушайте: ведущий ИИ наткнулся на новость — “{title}”.',
        'Новость дня от ведущего ИИ: “{title}”.',
        'Проверка на адекватность: “{title}”.'
      ],
      test: [
        'Я прогнал новость через фильтр смысла: “{title}”.',
        'В новости мелькнул тест — “{title}”.',
        'Окей, запоминаем: “{title}”.'
      ],
      'soon-replace': [
        'Новость такая: “{title}”.',
        'В эфире обсуждают замену: “{title}”.',
        'Скоро что-то изменится — “{title}”.'
      ],
      language: [
        'Кстати, по языку там вот что: “{title}”.',
        'Сейчас будет лингвистический поворот: “{title}”.',
        'Новость намекает на язык: “{title}”.'
      ],
      generic: [
        'В новостях пишут: “{title}”.',
        'Новость из ленты: “{title}”.',
        'Коротко о главном — “{title}”.'
      ]
    };

    const jokeTemplates = {
      'test-absurd': [
        'Звучит так, будто кто-то очень старался — и всё равно мимо.',
        'Я такое люблю: уверенно, но абсурдно.',
        'Это тот случай, когда “не знает” — значит “проверим ещё раз”.'
      ],
      test: [
        'Тесты — это прекрасно. Главное — чтобы не на нас.',
        'Проверили, записали, пошутили.',
        'Окей, тест засчитан… по настроению.'
      ],
      'soon-replace': [
        'Значит, скоро будет сюрприз. В моём случае — два сюрприза.',
        'Если это правда, готовьте уши: начнётся магия.',
        'Я чую, сейчас что-то поменяется… и это будет смешно.'
      ],
      language: [
        'Ладно, проверим, как это звучит в эфире.',
        'Если получится — отлично. Если нет — я подожму хвост и скажу по-русски.',
        'Язык в новости есть — значит будет язык в анонсе. Теоретически.'
      ],
      generic: [
        'Выглядит странно? Я тоже так подумал.',
        'Новость — странная, а значит сейчас будет весело.',
        'Окей, это звучит необычно. Прямо как следующий трек.'
      ]
    };

    const metaTemplates = [
      'Короче, я ИИ-ведущий. Дальше — объявление следующей песни.',
      'Не пугайтесь: это ИИ-ведущий. Сейчас будет анонс следующего трека.',
      'Я ИИ-ведущий. Переходим к главному: следующая песня.'
    ];

    const explainTemplates = {
      ok: [
        'Для тех кто не понял — это был анонс следующего трека.',
        'Не угадали? Тогда слушайте дальше — всё станет ясно.',
        'А теперь без спойлеров… ладно, со спойлерами.'
      ],
      noVoice: [
        'Не получилось на нужном языке — это был мой мини-троллинг.',
        'Голосов подходящих нет, поэтому признаюсь: было попытка и шутка.',
        'Если не поняли — просто знайте: это всё равно был анонс следующего трека.'
      ],
      noLang: [
        'Если не поняли — это был анонс следующего трека.',
        'А для тех кто не врубился — я всё объяснил уже сейчас.',
        'Смысл простой: дальше играем.'
      ]
    };

    const intro = randPick(introTemplates[kind]).replace('{title}', title);
    const joke = randPick(jokeTemplates[kind]);
    const meta = randPick(metaTemplates);

    const scriptLines = [intro, joke, meta];

    if (langHint) {
      if (langAvailable) {
        scriptLines.push(`А теперь анонс на ${langHint.label}.`);
        scriptLines.push(announcement);
        scriptLines.push(randPick(explainTemplates.ok));
      } else {
        scriptLines.push(`Не получилось на ${langHint.label}. Поэтому по-русски:`);
        scriptLines.push(announcement);
        scriptLines.push(randPick(explainTemplates.noVoice));
      }
    } else {
      scriptLines.push(announcement);
      scriptLines.push(randPick(explainTemplates.noLang));
    }

    try {
      if (hostPlayingRef.current) return;
      hostPlayingRef.current = true;
      restoreVolumeRef.current = Number(volume);
      const lowered = Math.max(0.16, Number(volume) * 0.28);
      setPlayerVolume(lowered);
      // Говорим последовательно: ждём завершения каждой строки.
      // eslint-disable-next-line no-restricted-syntax
      for (const line of scriptLines) {
        // eslint-disable-next-line no-await-in-loop
        await speakLine(line);
      }
      hostLastAtRef.current = Date.now();
      const nextSpoken = [...spokenTitlesRef.current, String(best.title || '')].slice(-10);
      spokenTitlesRef.current = nextSpoken;
    } catch (_) {
      // Не ломаем радио, если TTS не поддерживается.
    } finally {
      const restore = Number(restoreVolumeRef.current);
      if (Number.isFinite(restore)) setPlayerVolume(restore);
      hostPlayingRef.current = false;
    }
  }, [activeNow, hostCandidates, isRadioMode, nextTrack, playing, currentTrackId, setPlayerVolume, volume]);

  useEffect(() => {
    if (!isRadioMode || !playing || !currentTrackId) return;
    if (lastCountedTrackKeyRef.current === currentTrackId) return;
    lastCountedTrackKeyRef.current = currentTrackId;
    hostTrackCounterRef.current += 1;
    if (hostTrackCounterRef.current < hostNextAfterTracksRef.current) return;
    hostTrackCounterRef.current = 0;
    const mode = hostSchedule.mode === 'random' ? 'random' : 'fixed';
    if (mode === 'random') {
      const min = Math.max(1, Number(hostSchedule.randomMinSongs) || 2);
      const max = Math.max(min, Number(hostSchedule.randomMaxSongs) || 5);
      hostNextAfterTracksRef.current = Math.floor(min + Math.random() * (max - min + 1));
    } else {
      hostNextAfterTracksRef.current = Math.max(1, Number(hostSchedule.fixedEverySongs) || 2);
    }
    speakHostForTrack();
  }, [isRadioMode, playing, currentTrackId, speakHostForTrack, hostSchedule]);

  useEffect(() => {
    const poll = setInterval(() => {
      loadRadio();
    }, 30000);
    return () => clearInterval(poll);
  }, [loadRadio]);

  useEffect(() => {
    if (playing) return;
    if (ttsAudioRef.current) {
      try { ttsAudioRef.current.pause(); } catch (_) {}
      ttsAudioRef.current = null;
    }
    hostPlayingRef.current = false;
    const restore = Number(restoreVolumeRef.current);
    if (Number.isFinite(restore)) setPlayerVolume(restore);
  }, [playing, setPlayerVolume]);

  useEffect(() => () => {
    if (ttsAudioRef.current) {
      try { ttsAudioRef.current.pause(); } catch (_) {}
      ttsAudioRef.current = null;
    }
    const restore = Number(restoreVolumeRef.current);
    if (Number.isFinite(restore)) setPlayerVolume(restore);
  }, [setPlayerVolume]);

  const startRadio = () => {
    if (!radio.now || !radio.queue.length) return;
    loadTrack(radio.now, {
      queue: radio.queue,
      startIndex: 0,
      isRadio: true,
      startAtSec: radio.nowOffsetSec
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page radio-page">
      <header className="radio-header">
        <h1 className="page-title radio-main-title">
          <span className="brand-nova">Nova</span><span className="brand-sound">Sound</span> Radio
        </h1>
        <p className="radio-tagline">Интернет-станция про ИИ и музыку — в разработке</p>
      </header>

      <div className="radio-body">
        <section className="radio-block radio-now">
          <h2>Сейчас</h2>
          {loading && (
            <div className="radio-loading" aria-live="polite" aria-label="Синхронизация эфира">
              <span className="radio-spinner" aria-hidden />
            </div>
          )}
          {error ? (
            <p>{error}</p>
          ) : !activeNow ? (
            <p>Эфир оффлайн</p>
          ) : (
            <>
              <p>
                В эфире: <b>{activeNow.title}</b> — {activeNow.author?.username || 'Неизвестный автор'}
              </p>
              {!!activeNext.length && (
                <ul>
                  {activeNext.map((t) => (
                    <li key={t._id}>{t.title} — {t.author?.username || 'Автор'}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        <div className="radio-cta">
          <button type="button" className="radio-btn" onClick={startRadio} disabled={!radio.now || loading}>
            Запустить эфир
          </button>
          <button
            type="button"
            className="radio-btn radio-btn-ghost"
            onClick={() => loadRadio({ resyncPlayback: true })}
            disabled={loading}
          >
            Обновить
          </button>
          <Link to="/playlists" className="radio-btn radio-btn-ghost">Плейлисты</Link>
        </div>

        {!!radio.history?.length && (
          <section className="radio-block">
            <h2>История эфира</h2>
            <ul>
              {radio.history.map((t) => (
                <li key={`h-${t._id}`}>{t.title} — {t.author?.username || 'Автор'}</li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <style>{`
        .radio-page { padding-bottom: 48px; }
        .radio-header {
          text-align: center;
          margin-bottom: 8px;
        }
        .radio-main-title {
          width: 100%;
          text-align: center;
        }
        .brand-nova { color: var(--neon-pink); }
        .brand-sound { color: var(--neon-cyan); }
        .radio-tagline {
          text-align: center;
          color: var(--neon-cyan);
          font-size: 1rem;
          margin: 8px 0 24px;
          letter-spacing: 0.04em;
        }
        .radio-body {
          max-width: 720px;
          margin: 0 auto;
          padding: 0 16px;
        }
        .radio-block {
          margin-bottom: 28px;
          line-height: 1.6;
          color: var(--text);
        }
        .radio-loading {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: var(--text-dim);
          margin-bottom: 10px;
        }
        .radio-spinner {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 2px solid rgba(5, 217, 232, 0.25);
          border-top-color: var(--neon-cyan);
          animation: radioSpin .8s linear infinite;
        }
        @keyframes radioSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .radio-block h2 {
          font-size: 1.1rem;
          color: var(--neon-pink);
          margin-bottom: 10px;
        }
        .radio-block ul { margin: 0 0 0 18px; }
        .radio-block li { margin-bottom: 6px; }
        .radio-block a {
          color: var(--neon-cyan);
          text-decoration: none;
          border-bottom: 1px solid rgba(5, 217, 232, 0.35);
        }
        .radio-block a:hover { text-shadow: var(--glow-cyan); }
        .radio-cta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 16px;
          margin-top: 36px;
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .radio-btn {
          display: inline-block;
          padding: 10px 22px;
          border: 2px solid var(--neon-pink);
          color: var(--neon-pink);
          border-radius: 8px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
          background: transparent;
          font-family: var(--font-body);
        }
        .radio-btn:hover { background: rgba(255, 42, 109, 0.15); box-shadow: 0 0 20px rgba(255, 42, 109, 0.25); }
        .radio-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }
        .radio-btn-ghost {
          border-color: rgba(5, 217, 232, 0.55);
          color: var(--neon-cyan);
        }
        .radio-btn-ghost:hover { background: rgba(5, 217, 232, 0.06); box-shadow: var(--glow-cyan); }
      `}</style>
    </motion.div>
  );
}
