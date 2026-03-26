import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import client, { tracks as tracksApi } from '../api/client';
import { usePlayer } from '../context/PlayerContext';

/**
 * Ведущий радио: должен жить в Layout, а не на странице /radio —
 * иначе при уходе со страницы логика размонтируется и TTS не вызывается.
 */
export default function RadioHost() {
  const {
    currentTrack,
    queue,
    queueIndex,
    isRadioMode,
    playing,
    volume,
    setPlayerVolume
  } = usePlayer();

  const [hostNews, setHostNews] = useState([]);
  const [hostSchedule, setHostSchedule] = useState({
    mode: 'fixed',
    fixedEverySongs: 2,
    randomMinSongs: 2,
    randomMaxSongs: 5
  });
  const [djEpisode, setDjEpisode] = useState(null);

  const hostTimerRef = useRef(null);
  const lastSpokenKeyRef = useRef('');
  const hostScheduleSigRef = useRef('');
  const lastEpisodeAnnouncedRef = useRef('');
  const ttsAudioRef = useRef(null);
  const hostPlayingRef = useRef(false);
  const restoreVolumeRef = useRef(null);
  const spokenTitlesRef = useRef([]);
  const hostTrackCounterRef = useRef(0);
  const lastCountedSlotKeyRef = useRef('');
  const hostNextAfterTracksRef = useRef(2);

  const activeNow = isRadioMode && currentTrack ? currentTrack : null;
  const currentTrackId = currentTrack?._id ? String(currentTrack._id) : '';
  /** Уникальный слот воспроизведения: один и тот же трек может быть в очереди дважды под разными индексами */
  const playbackSlotKey = currentTrackId ? `${queueIndex}-${currentTrackId}` : '';

  const loadHostNews = useCallback(async () => {
    try {
      const { data } = await client.get('/announcements', { params: { limit: 20 } });
      setHostNews(Array.isArray(data?.items) ? data.items : []);
    } catch (_) {}
  }, []);

  const loadDjEpisode = useCallback(async () => {
    if (!isRadioMode) return;
    try {
      const { data } = await tracksApi.radioNow({ limit: 30 });
      setDjEpisode(data?.djEpisode || null);
    } catch (_) {}
  }, [isRadioMode]);

  useEffect(() => {
    loadHostNews();
    hostTimerRef.current = window.setInterval(loadHostNews, 60000);
    return () => {
      if (hostTimerRef.current) window.clearInterval(hostTimerRef.current);
    };
  }, [loadHostNews]);

  useEffect(() => {
    if (!isRadioMode) {
      setDjEpisode(null);
      return;
    }
    loadDjEpisode();
    const id = window.setInterval(loadDjEpisode, 90000);
    return () => window.clearInterval(id);
  }, [isRadioMode, loadDjEpisode]);

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
    const sig = JSON.stringify({
      mode: hostSchedule.mode,
      fixedEverySongs: hostSchedule.fixedEverySongs,
      randomMinSongs: hostSchedule.randomMinSongs,
      randomMaxSongs: hostSchedule.randomMaxSongs
    });
    if (hostScheduleSigRef.current === sig) return;
    hostScheduleSigRef.current = sig;
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
      .map((ch) => map[ch] ?? (/\d/.test(ch) ? ch : ''))
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

  const speakHostForTrack = useCallback(async () => {
    if (!isRadioMode) return;
    if (!playing) return;
    if (!activeNow) return;
    const trackKey = playbackSlotKey;
    if (!trackKey) return;
    if (lastSpokenKeyRef.current === trackKey && hostPlayingRef.current) return;

    let effectiveNext =
      isRadioMode && Array.isArray(queue) && queue.length > queueIndex + 1
        ? queue[queueIndex + 1]
        : null;
    if (!effectiveNext) {
      try {
        const { data } = await tracksApi.radioNow({ limit: 30 });
        const q = Array.isArray(data?.queue) ? data.queue : [];
        const idx = currentTrackId ? q.findIndex((t) => String(t?._id) === currentTrackId) : -1;
        if (idx >= 0 && idx + 1 < q.length) {
          effectiveNext = q[idx + 1];
        } else if (Array.isArray(data?.next) && data.next[0]) {
          effectiveNext = data.next[0];
        }
      } catch (_) {}
    }
    if (!effectiveNext) return;
    if (!playing) return;

    const spoken = spokenTitlesRef.current;
    let best = null;
    if (hostCandidates.length) {
      const sorted = [...hostCandidates].sort((a, b) => scoreHostTitle(b.title) - scoreHostTitle(a.title));
      best = sorted.find((x) => {
        const title = String(x?.title || '');
        return title && !spoken.includes(title);
      }) || sorted[0] || hostCandidates[0];
    }

    const fallbackBestTitle = String(djEpisode?.tag || effectiveNext.title || 'следующая песня');
    const bestTitle = String(best?.title || fallbackBestTitle);
    if (!bestTitle.trim()) return;

    const langHint = detectLangHint(bestTitle);

    const nextTitle = effectiveNext.title || 'следующая песня';
    const nextAuthorRaw = effectiveNext.author?.username || '—';
    const nextAuthorSpoken = transcribeNickToSpokenRu(nextAuthorRaw);
    const announcement = `Следующая песня: ${nextTitle}. Автор: ${nextAuthorSpoken}.`;

    const title = bestTitle.slice(0, 120);

    const randPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const classifyNews = (t) => {
      const lt = String(t || '').toLowerCase();
      if (lt.includes('ни одна') || lt.includes('не знает') || lt.includes('не понимает')) return 'test-absurd';
      if (lt.includes('тест') || lt.includes('провер') || lt.includes('протест')) return 'test';
      if (lt.includes('скоро') || lt.includes('замен') || lt.includes('вместо') || lt.includes('выйдет')) return 'soon-replace';
      if (langHint) return 'language';
      return 'generic';
    };

    const kindCandidate = classifyNews(title);
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

    const kind = introTemplates[kindCandidate] ? kindCandidate : 'generic';

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
      noLang: [
        'Если не поняли — это был анонс следующего трека.',
        'А для тех кто не врубился — я всё объяснил уже сейчас.',
        'Смысл простой: дальше играем.'
      ]
    };

    const intro = randPick(introTemplates[kind]).replace('{title}', title);
    const joke = randPick(jokeTemplates[kind]);
    const meta = randPick(metaTemplates);

    const buildEpisodeLine = (episode) => {
      if (!episode?.tag) return '';
      const moodType = String(episode.moodType || '');
      const seedStr = String(episode.id || '');
      let seed = 0;
      for (const ch of seedStr) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;

      const pick = (arr) => arr[seed % arr.length];
      if (moodType === 'morning_chill') {
        return pick([
          `Лови утренний чилл: ${episode.tag}.`,
          `Это утренний вайб без лишних слов: ${episode.tag}.`,
          `Утро включило свой режим: ${episode.tag}.`
        ]);
      }
      if (moodType === 'morning_sad') {
        return pick([
          `Утренний вайб с мягким грустняком: ${episode.tag}.`,
          `Сегодня утро умеет быть кинематографичным: ${episode.tag}.`,
          `Дождь внутри и снаружи — утренний вайб: ${episode.tag}.`
        ]);
      }
      if (moodType === 'night_chill') {
        return pick([
          `Ночной чилл включён: ${episode.tag}.`,
          `После полуночи всё вкуснее — ночной вайб: ${episode.tag}.`,
          `Тихий режим города: ${episode.tag}.`
        ]);
      }
      return pick([
        `Сегодня у нас особый вайб: ${episode.tag}.`,
        `Включаем настроение: ${episode.tag}.`
      ]);
    };

    let episodeLine = '';
    const epId = djEpisode?.id ? String(djEpisode.id) : '';
    const shouldAnnounceEpisode = epId && lastEpisodeAnnouncedRef.current !== epId;
    if (shouldAnnounceEpisode) {
      episodeLine = buildEpisodeLine(djEpisode);
    }

    const scriptLines = episodeLine ? [episodeLine, intro, meta] : [intro, joke, meta];

    // TTS только ru-RU (edge-tts) — «мультиязычный» анонс не озвучиваем, текст остаётся по-русски
    if (langHint) {
      scriptLines.push(`Новость с уклоном в тему языка — читаю анонс следующего трека по-русски.`);
      scriptLines.push(announcement);
      scriptLines.push(randPick(explainTemplates.ok));
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
      let playedLines = 0;
      // eslint-disable-next-line no-restricted-syntax
      for (const line of scriptLines) {
        // eslint-disable-next-line no-await-in-loop
        const ok = await speakLine(line);
        if (ok) playedLines += 1;
      }
      if (playedLines > 0) {
        lastSpokenKeyRef.current = trackKey;
        if (shouldAnnounceEpisode) {
          lastEpisodeAnnouncedRef.current = epId;
        }
      }
      if (best?.title) {
        const nextSpoken = [...spokenTitlesRef.current, String(best.title || '')].slice(-10);
        spokenTitlesRef.current = nextSpoken;
      }
    } catch (_) {
      // TTS недоступен
    } finally {
      const restore = Number(restoreVolumeRef.current);
      if (Number.isFinite(restore)) setPlayerVolume(restore);
      hostPlayingRef.current = false;
    }
  }, [
    activeNow,
    hostCandidates,
    isRadioMode,
    playing,
    currentTrackId,
    playbackSlotKey,
    queue,
    queueIndex,
    setPlayerVolume,
    volume,
    djEpisode
  ]);

  useEffect(() => {
    if (!isRadioMode || !playing || !playbackSlotKey) return;
    if (lastCountedSlotKeyRef.current === playbackSlotKey) return;
    lastCountedSlotKeyRef.current = playbackSlotKey;
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
    void speakHostForTrack();
  }, [isRadioMode, playing, playbackSlotKey, speakHostForTrack, hostSchedule]);

  useEffect(() => {
    if (playing) return;
    if (hostPlayingRef.current) return;
    if (ttsAudioRef.current) {
      try { ttsAudioRef.current.pause(); } catch (_) {}
      ttsAudioRef.current = null;
    }
    hostPlayingRef.current = false;
    const restoreRaw = restoreVolumeRef.current;
    if (restoreRaw === null || restoreRaw === undefined) return;
    const restore = Number(restoreRaw);
    if (Number.isFinite(restore)) setPlayerVolume(restore);
  }, [playing, setPlayerVolume]);

  useEffect(() => () => {
    if (ttsAudioRef.current) {
      try { ttsAudioRef.current.pause(); } catch (_) {}
      ttsAudioRef.current = null;
    }
    const restoreRaw = restoreVolumeRef.current;
    if (restoreRaw === null || restoreRaw === undefined) return;
    const restore = Number(restoreRaw);
    if (Number.isFinite(restore)) setPlayerVolume(restore);
  }, [setPlayerVolume]);

  return null;
}
