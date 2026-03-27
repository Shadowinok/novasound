import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import client, { tracks as tracksApi } from '../api/client';
import { usePlayer } from '../context/PlayerContext';

/**
 * Ведущий радио: должен жить в Layout, а не на странице /radio —
 * иначе при уходе со страницы логика размонтируется и TTS не вызывается.
 *
 * React Strict Mode лишь в dev может дважды монтировать компоненты; production-сборка ведёт себя как один mount.
 */
export default function RadioHost() {
  const DJ_NAME = 'ЗЕРО';
  const {
    currentTrack,
    queue,
    queueIndex,
    isRadioMode,
    playing,
    progress,
    duration,
    volume,
    applyMusicDuck,
    releaseMusicDuck,
    pauseForHost,
    resumeAfterHost,
    advanceRadioAfterHost
  } = usePlayer();

  const [hostNews, setHostNews] = useState([]);
  const [hostLinePool, setHostLinePool] = useState({
    joke: [],
    fact: [],
    'news-bridge': [],
    'news-outro': [],
    'track-next': [],
    'track-current': []
  });
  const [hostSchedule, setHostSchedule] = useState({
    mode: 'fixed',
    fixedEverySongs: 2,
    randomMinSongs: 2,
    randomMaxSongs: 5
  });
  const [djEpisode, setDjEpisode] = useState(null);
  const [currentTimeBlock, setCurrentTimeBlock] = useState(null);

  const hostTimerRef = useRef(null);
  const lastSpokenKeyRef = useRef('');
  const hostScheduleSigRef = useRef('');
  const lastEpisodeAnnouncedRef = useRef('');
  const ttsAudioRef = useRef(null);
  const hostPlayingRef = useRef(false);
  const spokenTitlesRef = useRef([]);
  /** Музыка тише голоса ведущего (только gain элемента Audio; ползунок — громкость пользователя) */
  const DUCK_MUSIC_FACTOR = 0.09;
  /** Громкость голоса ведущего относительно пользовательской громкости плеера */
  const HOST_VOICE_FACTOR = 0.72;
  const lastNewsBlockAtRef = useRef(0);
  const lastHourlyNewsKeyRef = useRef('');
  const lastFormatRef = useRef('');
  const speakScheduleTimerRef = useRef(null);
  const newsBedCtxRef = useRef(null);
  const newsBedMasterGainRef = useRef(null);
  const newsBedNodesRef = useRef([]);
  const newsBedPulseTimerRef = useRef(null);
  const hostTrackCounterRef = useRef(0);
  const lastCountedSlotKeyRef = useRef('');
  const hostNextAfterTracksRef = useRef(2);
  const livePlaybackSlotKeyRef = useRef('');
  const liveIsRadioModeRef = useRef(false);
  const livePlayingRef = useRef(false);
  const lastAnnouncedBlockIdRef = useRef('');

  const activeNow = isRadioMode && currentTrack ? currentTrack : null;
  const currentTrackId = currentTrack?._id ? String(currentTrack._id) : '';
  /** Уникальный слот воспроизведения: один и тот же трек может быть в очереди дважды под разными индексами */
  const playbackSlotKey = currentTrackId ? `${queueIndex}-${currentTrackId}` : '';

  useEffect(() => {
    livePlaybackSlotKeyRef.current = playbackSlotKey;
  }, [playbackSlotKey]);

  useEffect(() => {
    liveIsRadioModeRef.current = isRadioMode;
  }, [isRadioMode]);

  useEffect(() => {
    livePlayingRef.current = playing;
  }, [playing]);

  const loadHostNews = useCallback(async () => {
    try {
      const { data } = await client.get('/announcements', { params: { limit: 20 } });
      setHostNews(Array.isArray(data?.items) ? data.items : []);
    } catch (_) {}
  }, []);

  const loadHostLines = useCallback(async () => {
    try {
      const { data } = await client.get('/announcements/host-lines', {
        params: {
          types: 'joke,fact,news-bridge,news-outro,track-next,track-current',
          limitPerType: 80
        }
      });
      const items = data?.items || {};
      const normalizePool = (list) => (Array.isArray(list) ? list : [])
        .map((x) => {
          if (!x) return null;
          if (typeof x === 'string') return { text: x, mood: 'neutral', cue: 'none', rateMin: 6, rateMax: 14 };
          const text = String(x.text || '').trim();
          if (!text) return null;
          return {
            text,
            mood: String(x.mood || 'neutral'),
            cue: String(x.cue || 'none'),
            rateMin: Number.isFinite(Number(x.rateMin)) ? Number(x.rateMin) : 6,
            rateMax: Number.isFinite(Number(x.rateMax)) ? Number(x.rateMax) : 14
          };
        })
        .filter(Boolean);
      setHostLinePool({
        joke: normalizePool(items?.joke),
        fact: normalizePool(items?.fact),
        'news-bridge': normalizePool(items?.['news-bridge']),
        'news-outro': normalizePool(items?.['news-outro']),
        'track-next': normalizePool(items?.['track-next']),
        'track-current': normalizePool(items?.['track-current'])
      });
    } catch (_) {}
  }, []);

  const loadDjEpisode = useCallback(async () => {
    if (!isRadioMode) return;
    try {
      const { data } = await tracksApi.radioNow({ limit: 30 });
      setDjEpisode(data?.djEpisode || null);
      setCurrentTimeBlock(data?.timeBlock || null);
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
    loadHostLines();
    const id = window.setInterval(loadHostLines, 10 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [loadHostLines]);

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
      'releases-news'
    ]);
    return items.filter((it) => allowedKinds.has(it?.kind) && !!it?.title);
  }, [hostNews]);

  const detectLangHint = (text) => {
    const t = String(text || '').toLowerCase();
    if (t.includes('чуваш')) return { label: 'чувашском' };
    if (t.includes('татар')) return { label: 'татарском' };
    if (t.includes('удмурт')) return { label: 'удмуртском' };
    if (t.includes('англий')) return { label: 'английском' };
    return null;
  };

  const transcribeNickToSpokenRu = (nick) => {
    const s = String(nick || '').trim();
    if (!s) return s;
    // Частый кейс: DJ. Rex / D.J Rex -> "ДИДЖЕЙ РЕКС"
    const djMatch = s.match(/^\s*d\.?\s*j\.?\s*[\s._-]*(.+)?$/i);
    if (djMatch) {
      const tail = String(djMatch[1] || '').trim();
      if (!tail) return 'ДИДЖЕЙ';
      return `ДИДЖЕЙ ${transcribeNickToSpokenRu(tail)}`.trim();
    }
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

  const speakLine = (text, rate = '+0%', hooks = {}) => {
    if (!text) return Promise.resolve(false);
    const voicePool = ['ru-RU-DmitryNeural', 'ru-RU-MaximNeural', 'ru-RU-PavelNeural'];
    const tryVoice = (idx) => {
      if (idx >= voicePool.length) return Promise.resolve(false);
      return client.get('/announcements/tts', {
        params: {
          text,
          voice: voicePool[idx],
          rate
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
            if (typeof hooks.shouldAbortBeforePlay === 'function' && hooks.shouldAbortBeforePlay()) {
              URL.revokeObjectURL(blobUrl);
              resolve(false);
              return;
            }
            const audio = new Audio(blobUrl);
            // Не 100%: привязываем голос к пользовательской громкости.
            const hostGain = Math.max(0.14, Math.min(1, Number(volume) * HOST_VOICE_FACTOR));
            audio.volume = hostGain;
            ttsAudioRef.current = audio;
            audio.onended = () => {
              URL.revokeObjectURL(blobUrl);
              resolve(true);
            };
            audio.onerror = () => {
              URL.revokeObjectURL(blobUrl);
              resolve(false);
            };
            audio.onplay = () => {
              if (typeof hooks.onPlaybackStart === 'function') hooks.onPlaybackStart();
            };
            if (typeof hooks.shouldAbortBeforePlay === 'function' && hooks.shouldAbortBeforePlay()) {
              URL.revokeObjectURL(blobUrl);
              resolve(false);
              return;
            }
            const maybePromise = audio.play();
            if (maybePromise && typeof maybePromise.then === 'function') {
              maybePromise.catch(() => {
                URL.revokeObjectURL(blobUrl);
                resolve(false);
              });
            }
          } catch (_) {
            URL.revokeObjectURL(blobUrl);
            resolve(false);
          }
        });
      }).catch(() => tryVoice(idx + 1));
    };
    return tryVoice(0);
  };

  const startNewsBed = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (newsBedCtxRef.current) return;
      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = 0.0001;
      master.connect(ctx.destination);
      if (ctx.state === 'suspended') {
        try { ctx.resume(); } catch (_) {}
      }

      const pulse = (baseFreq = 392) => {
        const t0 = ctx.currentTime;
        const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5];
        notes.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = f;
          const g = ctx.createGain();
          g.gain.value = 0.0001;
          osc.connect(g);
          g.connect(master);
          const startAt = t0 + (idx * 0.06);
          g.gain.setValueAtTime(0.0001, startAt);
          g.gain.linearRampToValueAtTime(0.025, startAt + 0.05);
          g.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.45);
          osc.start(startAt);
          osc.stop(startAt + 0.5);
          newsBedNodesRef.current.push({ osc, gain: g });
        });
      };

      newsBedCtxRef.current = ctx;
      newsBedMasterGainRef.current = master;
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.linearRampToValueAtTime(0.095, now + 0.6);
      pulse(392);
      newsBedPulseTimerRef.current = window.setInterval(() => {
        pulse(Math.random() < 0.5 ? 392 : 440);
      }, 2200);
    } catch (_) {}
  }, []);

  const stopNewsBed = useCallback(() => {
    const ctx = newsBedCtxRef.current;
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const master = newsBedMasterGainRef.current;
      if (master) {
        master.gain.cancelScheduledValues(now);
        master.gain.linearRampToValueAtTime(0.0001, now + 0.5);
      }
      if (newsBedPulseTimerRef.current) {
        window.clearInterval(newsBedPulseTimerRef.current);
        newsBedPulseTimerRef.current = null;
      }
      newsBedNodesRef.current.forEach((n) => {
        try {
          n.gain.gain.cancelScheduledValues(now);
          n.gain.gain.linearRampToValueAtTime(0.0001, now + 0.5);
        } catch (_) {}
      });
      window.setTimeout(() => {
        try {
          newsBedNodesRef.current.forEach((n) => {
            try { n.osc.stop(); } catch (_) {}
            try { n.osc.disconnect(); } catch (_) {}
            try { n.gain.disconnect(); } catch (_) {}
          });
          newsBedNodesRef.current = [];
          if (newsBedMasterGainRef.current) newsBedMasterGainRef.current.disconnect();
          newsBedMasterGainRef.current = null;
          if (newsBedCtxRef.current) newsBedCtxRef.current.close();
          newsBedCtxRef.current = null;
        } catch (_) {}
      }, 600);
    } catch (_) {}
  }, []);

  const speakHostForTrack = useCallback(async (opts = {}) => {
    const duckFactor = Math.max(0, Math.min(1, Number(opts.duckFactor ?? DUCK_MUSIC_FACTOR)));
    const forceFormat = String(opts.forceFormat || '');
    const announceMode = String(opts.announceMode || 'future');
    const pauseMusic = Boolean(opts.pauseMusic);
    const advanceToNextAfterSpeak = Boolean(opts.advanceToNextAfterSpeak);
    const prevBlockId = String(opts.prevBlockId || '');
    const nextBlockId = String(opts.nextBlockId || '');
    if (!isRadioMode) return;
    if (!playing) return;
    if (!activeNow) return;
    const trackKey = playbackSlotKey;
    const trackIdAtSpeakStart = currentTrackId;
    if (!trackKey) return;
    if (lastSpokenKeyRef.current === trackKey && hostPlayingRef.current) return;

    let episodeForSpeak = djEpisode;

    let effectiveNext =
      isRadioMode && Array.isArray(queue) && queue.length > queueIndex + 1
        ? queue[queueIndex + 1]
        : null;
    if (!effectiveNext) {
      try {
        const { data } = await tracksApi.radioNow({ limit: 30 });
        const serverNowId = data?.now?._id != null ? String(data.now._id) : '';
        // Не подставляем «следующий» из чужого снимка эфира, если сервер уже на другом треке
        if (!currentTrackId || serverNowId !== currentTrackId) {
          return;
        }
        if (data && Object.prototype.hasOwnProperty.call(data, 'djEpisode')) {
          episodeForSpeak = data.djEpisode || null;
          setDjEpisode(data.djEpisode || null);
        }
        if (data && Object.prototype.hasOwnProperty.call(data, 'timeBlock')) {
          setCurrentTimeBlock(data.timeBlock || null);
        }
        const q = Array.isArray(data?.queue) ? data.queue : [];
        const idx = q.findIndex((t) => String(t?._id) === currentTrackId);
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
    let newsPool = [];
    if (hostCandidates.length) {
      const sorted = [...hostCandidates].sort((a, b) => scoreHostTitle(b.title) - scoreHostTitle(a.title));
      newsPool = sorted;
      best = sorted.find((x) => {
        const title = String(x?.title || '');
        return title && !spoken.includes(title);
      }) || sorted[0] || hostCandidates[0];
    }

    const fallbackBestTitle = String(djEpisode?.tag || effectiveNext.title || 'следующая песня');
    const bestTitle = String(best?.title || fallbackBestTitle);
    if (!bestTitle.trim()) return;

    const currentTitle = String(activeNow?.title || 'текущий трек');
    const nextTitle = effectiveNext.title || 'следующая песня';
    const nextAuthorRaw = effectiveNext.author?.username || '—';
    const nextAuthorSpoken = transcribeNickToSpokenRu(nextAuthorRaw);
    const randPick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const chance = (p) => Math.random() < p;
    const rateHints = [];
    const withCue = (text, cue) => {
      if (!text) return text;
      if (cue === 'smile' && chance(0.2)) {
        return `${randPick(['Ну что ж,', 'Улыбнусь и скажу,', 'С лёгкой улыбкой:'])} ${text}`;
      }
      if (cue === 'serious' && chance(0.18)) {
        return `${randPick(['Если по делу,', 'Если серьёзно,', 'Без лишнего пафоса,'])} ${text}`;
      }
      return text;
    };
    const pickPoolEntry = (type, fallbackText) => {
      const list = Array.isArray(hostLinePool?.[type]) ? hostLinePool[type].filter(Boolean) : [];
      const entry = list.length ? randPick(list) : {
        text: String(fallbackText || ''),
        mood: 'neutral',
        cue: 'none',
        rateMin: 6,
        rateMax: 14
      };
      const min = Number(entry.rateMin);
      const max = Number(entry.rateMax);
      if (Number.isFinite(min) && Number.isFinite(max)) {
        const lo = Math.max(0, Math.min(min, max));
        const hi = Math.max(lo, Math.max(min, max));
        rateHints.push(lo + Math.floor(Math.random() * (hi - lo + 1)));
      }
      return entry;
    };
    const fillVars = (line, vars = {}, cue = 'none') => {
      let out = String(line || '').trim();
      Object.entries(vars).forEach(([k, v]) => {
        out = out.replaceAll(`{${k}}`, String(v || ''));
      });
      return withCue(out, cue);
    };
    const newsTitle = String(bestTitle).slice(0, 120);

    const trackTitleNorm = String(nextTitle || '').trim() || 'следующий трек';
    const includeAuthor = chance(0.42);
    const trackWithMaybeAuthor = includeAuthor
      ? `${trackTitleNorm}, автор ${nextAuthorSpoken}`
      : trackTitleNorm;
    const queueTailTitles = Array.isArray(queue)
      ? queue
        .slice(Math.max(0, queueIndex + 1), Math.max(0, queueIndex + 4))
        .map((t) => String(t?.title || '').trim())
        .filter(Boolean)
      : [];
    const playlistMoodWords = [
      'интересных',
      'свежих',
      'атмосферных',
      'цепляющих',
      'неожиданных',
      'мощных'
    ];
    const moodWord = randPick(playlistMoodWords);
    const programListLine = queueTailTitles.length
      ? randPick([
        `В сегодняшнем эфире прозвучат несколько ${moodWord} треков: ${queueTailTitles.join(', ')}.`,
        `По плану эфира на ближайшие минуты — ${queueTailTitles.join(', ')}.`,
        `Дальше в нашей музыкальной линии: ${queueTailTitles.join(', ')}.`,
        `Сегодня ещё поймаем вот такие вайбы: ${queueTailTitles.join(', ')}.`
      ])
      : randPick([
        `В сегодняшнем эфире будет ещё несколько ${moodWord} треков, не переключайся.`,
        'В этом блоке ещё будет чем удивить — слушаем дальше.',
        'Держись на линии эфира, дальше будет вкусно по музыке.'
      ]);
    const announceWithDjLead = chance(0.24);
    const djSelfTemplates = [
      `С вами ${DJ_NAME}.`,
      `У микрофона ваш ${DJ_NAME}.`,
      `Как всегда на связи ваш ${DJ_NAME}.`,
      `В эфире ваш ${DJ_NAME}.`,
      `На волне снова ${DJ_NAME}.`,
      `${DJ_NAME} в эфире, продолжаем.`
    ];

    const trackNextEntry = pickPoolEntry('track-next', `Дальше у нас ${trackWithMaybeAuthor}.`);
    const trackCurrentEntry = pickPoolEntry('track-current', `Сейчас в эфире ${currentTitle}.`);
    const trackLeadFutureTemplates = [
      fillVars(trackNextEntry.text, { track: trackWithMaybeAuthor }, trackNextEntry.cue)
    ];
    const trackLeadCurrentTemplates = [
      fillVars(trackCurrentEntry.text, { track: currentTitle }, trackCurrentEntry.cue)
    ];

    const trackPunTemplates = [
      `Если название “${trackTitleNorm}”, значит настроение уже выбрано за нас.`,
      `У трека “${trackTitleNorm}” вайб как у пятницы: появляется внезапно и вовремя.`,
      `Судя по названию “${trackTitleNorm}”, сегодня будет не скучно.`,
      `Название “${trackTitleNorm}” звучит как план на вечер. План одобряю.`,
      `Трек “${trackTitleNorm}” звучит как человек, который точно знает, что делает.`,
      `У “${trackTitleNorm}” энергия будто его писали с выключенным тормозом.`
    ];

    const lightTalkTemplates = [
      'Я тут проверил атмосферу в эфире: всё стабильно, музыка лечит.',
      'Короткий техперерыв на мысль: хороший трек иногда лучше длинного объяснения.',
      'В эфире всё по классике: меньше суеты, больше звука.',
      'Сегодня играем без лишнего шума, только то, что цепляет.',
      'Небольшой апдейт по настроению: держимся в правильной музыкальной полосе.',
      'Эфир идёт ровно так, как надо: немного драйва, немного воздуха.'
    ];

    const stationIdTemplates = [
      'NovaSound Radio на связи. Держим курс на хорошие треки.',
      'Ты в эфире NovaSound Radio. Продолжаем музыкальное путешествие.',
      'NovaSound Radio в деле. Без пафоса, зато с правильным вайбом.'
    ];

    const newsJokeTemplates = [
      `В ленте пишут: “${newsTitle}”. Звучит так уверенно, что я почти поверил.`,
      `Новости шепнули: “${newsTitle}”. Уровень драмы приличный, берём в эфир.`,
      `Поймал заголовок: “${newsTitle}”. Комментарий один: красиво сказано.`,
      `В новостях промелькнуло: “${newsTitle}”. Подача смелая, как минимум.`,
      `Лента выдала: “${newsTitle}”. Формулировка с характером, спорить не буду.`
    ];
    const newsItemsForBlock = newsPool
      .filter((x) => String(x?.title || '').trim())
      .slice(0, 5)
      .map((x) => String(x.title).slice(0, 140));
    const blockLabel = (id) => {
      if (id === 'morning') return 'утренний вайб';
      if (id === 'day') return 'дневной эфир';
      if (id === 'evening') return 'вечерний разгон';
      if (id === 'night') return 'ночной релакс';
      return 'обычный эфир';
    };
    const shortIronicFacts = [
      'будильник всегда звонит на самом интересном месте сна.',
      'очередь в магазине обычно быстрее двигается в соседней кассе.',
      'если танцевать дома, это уже кардио и почти спорт.',
      'чай остывает ровно к моменту, когда ты решил его выпить.',
      'самые важные мысли приходят, когда телефон в другой комнате.',
      'плейлист на час обычно слушается три часа.',
      'кнопка «один трек и спать» официально не работает.'
    ];
    const buildFactLine = (factBody, ctx = 'neutral') => {
      const body = String(factBody || '').trim();
      if (!body) return '';
      const introsNeutral = ['Кстати,', 'Между прочим,', 'Оказывается,', 'Забавно, но', 'Небольшое наблюдение:'];
      const introsPlayful = ['Кстати,', 'А ведь правда,', 'Вот что любопытно:', 'Между делом,', 'Смешной момент:'];
      const introsSerious = ['Если по делу,', 'Если серьёзно,', 'Без лишнего пафоса,', 'По наблюдениям,', 'По факту,'];
      const pick = ctx === 'playful' ? introsPlayful : (ctx === 'serious' ? introsSerious : introsNeutral);
      return `${randPick(pick)} ${body}`;
    };

    const newsCommentaryBuild = () => {
      const t = String(newsTitle || '').toLowerCase();
      const sarcastic = [
        'Выглядит громко, но в эфире проверяем всё ушами.',
        'Заявлено мощно, а мы спокойно фиксируем факт и идём дальше.',
        'Ну что ж, заявка заметная. Берём на заметку и продолжаем.'
      ];
      const punny = [
        'Смысл как будто есть, но детали решили остаться за кулисами.',
        'Заголовок с характером — редактор, видимо, был в настроении.',
        'Это тот случай, когда фраза звучит быстрее, чем успеваешь моргнуть.'
      ];
      if (t.includes('выйд') || t.includes('релиз') || t.includes('анонс')) {
        return randPick([
          'Похоже, нас снова готовят к громкому «скоро».',
          'Классика жанра: «скоро будет», а мы пока слушаем музыку.',
          'Релизный вайб считан, ждём подтверждения в реальности.'
        ]);
      }
      if (t.includes('тест') || t.includes('провер')) {
        return randPick([
          'Тесты любят все, особенно когда сдаёт кто-то другой.',
          'Проверка принята, настроение не пострадало.',
          'Звучит как эксперимент, а эксперименты мы уважаем.'
        ]);
      }
      return chance(0.5) ? randPick(sarcastic) : randPick(punny);
    };

    const buildDatePhrase = () => {
      const weekdays = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
      const monthsGen = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
      ];
      const now = new Date();
      const wd = weekdays[now.getDay()];
      const day = now.getDate();
      const month = monthsGen[now.getMonth()];
      return randPick([
        `Сегодня ${wd}, ${day} ${month}.`,
        `На календаре ${wd}, ${day} ${month}.`,
        `За окном ${wd}, ${day} ${month}.`,
        `Дата для эфира идеальная: ${wd}, ${day} ${month}.`
      ]);
    };

    const buildWeatherPhrase = () => {
      const weatherItems = hostNews.filter((x) => x?.kind === 'weather');
      if (!weatherItems.length) {
        return randPick([
          'По погоде сегодня без сюрпризов — главное, чтобы в наушниках было тепло.',
          'Погода пусть делает что хочет, у нас в эфире климат стабильный.',
          'С погодой разберёмся по пути, а сейчас держим музыкальный курс.'
        ]);
      }
      const w = weatherItems[Math.floor(Math.random() * weatherItems.length)];
      const city = String(w?.city || 'городе');
      const t = Number(w?.temperatureC);
      let mood = 'переменно';
      if (Number.isFinite(t)) {
        if (t <= -8) mood = 'морозно';
        else if (t <= 2) mood = 'прохладно';
        else if (t <= 14) mood = 'свежо';
        else if (t <= 24) mood = 'тепло';
        else mood = 'жарко';
      }
      return randPick([
        `В ${city} сейчас ${mood}.`,
        `По погоде в ${city} сегодня ${mood}.`,
        `Если смотреть на ${city}, то на улице ${mood}.`
      ]);
    };

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
    const epId = episodeForSpeak?.id ? String(episodeForSpeak.id) : '';
    const shouldAnnounceEpisode = epId && lastEpisodeAnnouncedRef.current !== epId;
    if (shouldAnnounceEpisode) {
      episodeLine = buildEpisodeLine(episodeForSpeak);
    }

    // Вариативный темп речи под "вайб" (ориентир: спокойный эфир ~150-170 wpm, энергичный ~170-190 wpm).
    const pickRateByVibe = () => {
      const mood = String(episodeForSpeak?.moodType || '').toLowerCase();
      let minPct = 8;
      let maxPct = 14;
      if (mood.includes('chill') || mood.includes('sad')) {
        minPct = 4;
        maxPct = 10;
      } else if (mood.includes('night')) {
        minPct = 6;
        maxPct = 12;
      } else if (mood === 'custom' || mood.includes('energy') || mood.includes('dance')) {
        minPct = 14;
        maxPct = 22;
      }
      const seedSrc = `${trackKey}:${epId || 'none'}`;
      let seed = 0;
      for (const ch of seedSrc) seed = (seed * 33 + ch.charCodeAt(0)) >>> 0;
      const span = Math.max(0, maxPct - minPct);
      let pct = minPct + (span ? (seed % (span + 1)) : 0);
      if (rateHints.length) {
        const hinted = rateHints[Math.floor(Math.random() * rateHints.length)];
        pct = Math.round((pct * 0.6) + (hinted * 0.4));
      }
      return `+${pct}%`;
    };
    const pickFormat = () => {
      if (forceFormat) return forceFormat;
      const roll = Math.random();
      const variants = [];
      if (roll < 0.45) variants.push('track-intro');
      else if (roll < 0.64) variants.push('light-talk');
      else if (roll < 0.79) variants.push('program-list');
      else if (roll < 0.93) variants.push('news-joke');
      else variants.push('id-jingle');
      variants.push('track-intro', 'light-talk', 'program-list', 'news-joke', 'id-jingle');
      const prev = lastFormatRef.current;
      return variants.find((f) => f !== prev) || variants[0];
    };

    const format = pickFormat();
    const scriptLines = [];
    if (episodeLine && chance(0.45)) scriptLines.push(episodeLine);
    const wrapWithFreshTrack = (line) => {
      if (announceMode !== 'future') return line;
      if (!line) return line;
      // Пересобираем строку перед озвучкой, если "следующий" уже изменился.
      const liveQueue = Array.isArray(queue) ? queue : [];
      const liveIdx = Math.max(0, Number(queueIndex) || 0);
      const liveNext = liveQueue[liveIdx + 1];
      const liveNextTitle = String(liveNext?.title || '').trim();
      if (!liveNextTitle || liveNextTitle === trackTitleNorm) return line;
      return line.replace(trackTitleNorm, liveNextTitle);
    };

    if (format === 'block-switch') {
      lastFormatRef.current = 'block-switch';
      if (prevBlockId && prevBlockId !== nextBlockId) {
        scriptLines.push(randPick([
          `Выходим из режима «${blockLabel(prevBlockId)}».`,
          `Блок «${blockLabel(prevBlockId)}» завершаем.`,
          `Сегмент «${blockLabel(prevBlockId)}» закрыт.`
        ]));
      }
      if (nextBlockId) {
        scriptLines.push(randPick([
          `Переходим в блок «${blockLabel(nextBlockId)}».`,
          `Сейчас включаем режим «${blockLabel(nextBlockId)}».`,
          `На ближайшее время у нас «${blockLabel(nextBlockId)}».`
        ]));
      }
      scriptLines.push(randPick(trackLeadCurrentTemplates));
    } else if (format === 'news-block') {
      lastNewsBlockAtRef.current = Date.now();
      lastFormatRef.current = 'news-block';
      scriptLines.push(randPick([
        `Всем привет, с вами ${DJ_NAME}.`,
        `И как всегда с вами ${DJ_NAME}, привет.`,
        `Привет, у микрофона ваш ${DJ_NAME}.`,
        `На связи ${DJ_NAME}, всем привет.`
      ]));
      scriptLines.push(buildDatePhrase());
      scriptLines.push(buildWeatherPhrase());
      scriptLines.push(randPick([
        'А дальше у нас новости.',
        'И теперь новости.',
        'И у нас новостной блок.',
        'Переходим в блок новостей.'
      ]));
      if (newsItemsForBlock.length) {
        scriptLines.push(`Поехали по актуальному. Новость первая: “${newsItemsForBlock[0]}”.`);
        newsItemsForBlock.slice(1).forEach((title, idx) => {
          const bridgeTemplates = [
            `Дальше по ленте: “${title}”.`,
            `Ещё заголовок в эфир: “${title}”.`,
            `Переключаемся на следующую тему: “${title}”.`,
            `Из свежего также: “${title}”.`,
            `Лента добавляет ещё пункт: “${title}”.`,
            `Идём дальше, вот что ещё: “${title}”.`,
            `Коротко о следующем: “${title}”.`,
            `Следующий инфо-штрих: “${title}”.`
          ];
          const line = idx === newsItemsForBlock.length - 2
            ? `И под финал новостного блока: “${title}”.`
            : (() => {
              const entry = pickPoolEntry('news-bridge', randPick(bridgeTemplates));
              return fillVars(entry.text, { title }, entry.cue);
            })();
          scriptLines.push(line);
        });
      } else {
        scriptLines.push(`В ленте обсуждают: “${newsTitle}”.`);
      }
      scriptLines.push(newsCommentaryBuild());
      const postNewsOutroTemplates = [
        'Это был новостной блок, а теперь возвращаемся к музыке.',
        'На этом с новостями всё, продолжаем музыкальный эфир.',
        'Новости на паузу, треки на максимум.',
        'Инфо-часть завершили, дальше снова чистый музыкальный поток.',
        'Новостной дайджест закрыт, переходим обратно в ритм эфира.',
        'С новостями разобрались, продолжаем наш музыкальный маршрут.',
        'Информационный блок завершён, дальше только музыка и настроение.'
      ];
      {
        const entry = pickPoolEntry('news-outro', randPick(postNewsOutroTemplates));
        scriptLines.push(fillVars(entry.text, {}, entry.cue));
      }
      if (chance(0.45)) {
        const entry = pickPoolEntry('fact', randPick(shortIronicFacts));
        scriptLines.push(buildFactLine(fillVars(entry.text, {}, entry.cue), 'neutral'));
      }
      if (announceWithDjLead) scriptLines.push(randPick(djSelfTemplates));
      scriptLines.push(wrapWithFreshTrack(randPick(trackLeadFutureTemplates)));
    } else if (format === 'news-joke' && hostCandidates.length) {
      lastFormatRef.current = 'news-joke';
      {
        const entry = pickPoolEntry('joke', randPick(newsJokeTemplates));
        scriptLines.push(fillVars(entry.text, {}, entry.cue));
      }
      scriptLines.push(newsCommentaryBuild());
      if (announceMode === 'future') scriptLines.push(wrapWithFreshTrack(randPick(trackLeadFutureTemplates)));
      else scriptLines.push(programListLine);
    } else if (format === 'id-jingle') {
      lastFormatRef.current = 'id-jingle';
      scriptLines.push(randPick(stationIdTemplates));
      if (announceMode === 'future') scriptLines.push(wrapWithFreshTrack(randPick(trackLeadFutureTemplates)));
      else scriptLines.push(programListLine);
    } else if (format === 'light-talk') {
      lastFormatRef.current = 'light-talk';
      scriptLines.push(randPick(lightTalkTemplates));
      if (announceMode === 'future') scriptLines.push(wrapWithFreshTrack(randPick(trackLeadFutureTemplates)));
      else scriptLines.push(programListLine);
    } else if (format === 'program-list') {
      lastFormatRef.current = 'program-list';
      if (announceWithDjLead) scriptLines.push(randPick(djSelfTemplates));
      scriptLines.push(programListLine);
      if (chance(0.35)) {
        scriptLines.push(randPick([
          'Сейчас держим темп, дальше только интереснее.',
          'Так что устраивайся поудобнее, эфир только разгоняется.',
          'В общем, программа плотная — едем дальше.'
        ]));
      }
    } else {
      lastFormatRef.current = 'track-intro';
      if (announceWithDjLead) scriptLines.push(randPick(djSelfTemplates));
      if (announceMode === 'future') {
        scriptLines.push(wrapWithFreshTrack(randPick(trackLeadFutureTemplates)));
      } else {
        scriptLines.push(randPick(trackLeadCurrentTemplates));
        scriptLines.push(programListLine);
      }
      if (chance(0.55)) scriptLines.push(randPick(trackPunTemplates));
    }

    if (lastFormatRef.current !== 'news-block' && chance(0.08) && hostCandidates.length) {
      scriptLines.push(`Кстати, в ленте мелькнул заголовок: “${newsTitle}”.`);
      scriptLines.push(newsCommentaryBuild());
      scriptLines.push(randPick([
        'Дальше по музыкальному курсу.',
        'Ладно, фиксируем и возвращаемся к трекам.',
        'А теперь снова в звук — там стабильнее.'
      ]));
    }
    if (lastFormatRef.current !== 'news-block' && chance(0.12)) {
      {
        const entry = pickPoolEntry('fact', randPick(shortIronicFacts));
        scriptLines.push(buildFactLine(fillVars(entry.text, {}, entry.cue), lastFormatRef.current === 'light-talk' ? 'playful' : 'neutral'));
      }
    }

    try {
      if (hostPlayingRef.current) return;
      hostPlayingRef.current = true;
      if (forceFormat === 'news-block') startNewsBed();
      if (pauseMusic && isRadioMode) pauseForHost();
      // Один запрос вместо серии фраз: меньше сетевых пауз между репликами.
      const fullScript = scriptLines
        .map((line) => String(line || '').trim())
        .filter(Boolean)
        .join(' ');
      let duckApplied = false;
      const isOutdatedSpeech = () => (
        !liveIsRadioModeRef.current
        || !livePlayingRef.current
        || !livePlaybackSlotKeyRef.current
        || livePlaybackSlotKeyRef.current !== trackKey
      );
      if (isOutdatedSpeech()) {
        hostPlayingRef.current = false;
        return;
      }
      const played = await speakLine(fullScript, pickRateByVibe(), {
        shouldAbortBeforePlay: isOutdatedSpeech,
        onPlaybackStart: () => {
          if (isOutdatedSpeech()) return;
          if (duckApplied) return;
          duckApplied = true;
          applyMusicDuck(duckFactor);
        }
      });
      if (played) {
        lastSpokenKeyRef.current = trackKey;
        if (shouldAnnounceEpisode) {
          lastEpisodeAnnouncedRef.current = epId;
        }
      }
      if (newsItemsForBlock.length) {
        const nextSpoken = [...spokenTitlesRef.current, ...newsItemsForBlock].slice(-12);
        spokenTitlesRef.current = nextSpoken;
      } else if (best?.title) {
        const nextSpoken = [...spokenTitlesRef.current, String(best.title || '')].slice(-12);
        spokenTitlesRef.current = nextSpoken;
      }
    } catch (_) {
      // TTS недоступен
    } finally {
      if (pauseMusic && isRadioMode) {
        if (advanceToNextAfterSpeak) {
          const moved = await advanceRadioAfterHost(trackIdAtSpeakStart);
          if (!moved) resumeAfterHost();
        } else {
          resumeAfterHost();
        }
      }
      releaseMusicDuck();
      if (forceFormat === 'news-block') stopNewsBed();
      hostPlayingRef.current = false;
    }
  }, [
    activeNow,
    applyMusicDuck,
    hostCandidates,
    isRadioMode,
    playing,
    currentTrackId,
    playbackSlotKey,
    queue,
    queueIndex,
    pauseForHost,
    releaseMusicDuck,
    resumeAfterHost,
    startNewsBed,
    stopNewsBed,
    volume,
    djEpisode,
    setDjEpisode
    ,
    advanceRadioAfterHost
    ,
    hostLinePool
  ]);

  const scheduleSpeakForTrack = useCallback(() => {
    if (speakScheduleTimerRef.current) {
      window.clearTimeout(speakScheduleTimerRef.current);
      speakScheduleTimerRef.current = null;
    }
    const remainingSec = Math.max(
      0,
      Number(duration || currentTrack?.duration || 0) - Number(progress || 0)
    );
    // 30% начало, 20% без наложения, 20% склейка, 30% конец.
    const roll = Math.random();
    let delayMs = 700;
    let duckFactor = DUCK_MUSIC_FACTOR;
    let announceMode = 'future';
    let pauseMusic = false;
    let advanceToNextAfterSpeak = false;
    if (roll < 0.3) {
      delayMs = 700;
      duckFactor = 0.1;
      announceMode = 'program';
    } else if (roll < 0.5) {
      // "Честный" межтрековый брейк: перед концом трека ставим паузу, говорим и запускаем следующий.
      delayMs = Math.max(250, Math.min(12000, (remainingSec - 0.18) * 1000));
      duckFactor = 0;
      announceMode = 'program';
      pauseMusic = true;
      advanceToNextAfterSpeak = true;
    } else if (roll < 0.7) {
      delayMs = Math.max(450, Math.min(14000, (remainingSec - 2.2) * 1000));
      duckFactor = 0.09;
      announceMode = 'future';
    } else {
      delayMs = Math.max(450, Math.min(14000, (remainingSec - 6.0) * 1000));
      duckFactor = 0.09;
      announceMode = 'future';
    }
    if (!Number.isFinite(delayMs) || delayMs < 0) delayMs = 700;
    speakScheduleTimerRef.current = window.setTimeout(() => {
      speakScheduleTimerRef.current = null;
      void speakHostForTrack({ duckFactor, announceMode, pauseMusic, advanceToNextAfterSpeak });
    }, delayMs);
  }, [DUCK_MUSIC_FACTOR, currentTrack?.duration, duration, progress, speakHostForTrack]);

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
    scheduleSpeakForTrack();
  }, [isRadioMode, playing, playbackSlotKey, scheduleSpeakForTrack, hostSchedule]);

  useEffect(() => {
    const nextId = String(currentTimeBlock?.id || '');
    if (!nextId) return;
    if (!isRadioMode || !playing) {
      lastAnnouncedBlockIdRef.current = nextId;
      return;
    }
    const prevId = String(lastAnnouncedBlockIdRef.current || '');
    if (!prevId) {
      lastAnnouncedBlockIdRef.current = nextId;
      return;
    }
    if (prevId === nextId) return;
    lastAnnouncedBlockIdRef.current = nextId;
    if (speakScheduleTimerRef.current) {
      window.clearTimeout(speakScheduleTimerRef.current);
      speakScheduleTimerRef.current = null;
    }
    void speakHostForTrack({
      forceFormat: 'block-switch',
      pauseMusic: true,
      duckFactor: 0,
      prevBlockId: prevId,
      nextBlockId: nextId
    });
  }, [currentTimeBlock, isRadioMode, playing, speakHostForTrack]);

  useEffect(() => {
    if (playing) return;
    if (speakScheduleTimerRef.current) {
      window.clearTimeout(speakScheduleTimerRef.current);
      speakScheduleTimerRef.current = null;
    }
  }, [playing]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!isRadioMode || !playing) return;
      if (hostPlayingRef.current) return;
      const now = new Date();
      if (now.getMinutes() !== 0) return;
      // Стартуем в начале часа; расширяем окно, чтобы не пропускать блок при фоне вкладки.
      if (now.getSeconds() > 45) return;
      const hourKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}`;
      if (lastHourlyNewsKeyRef.current === hourKey) return;
      lastHourlyNewsKeyRef.current = hourKey;
      lastNewsBlockAtRef.current = Date.now();
      if (speakScheduleTimerRef.current) {
        window.clearTimeout(speakScheduleTimerRef.current);
        speakScheduleTimerRef.current = null;
      }
      void speakHostForTrack({ forceFormat: 'news-block', duckFactor: 0, pauseMusic: true });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRadioMode, playing, speakHostForTrack]);

  useEffect(() => {
    if (playing) return;
    if (hostPlayingRef.current) return;
    if (ttsAudioRef.current) {
      try { ttsAudioRef.current.pause(); } catch (_) {}
      ttsAudioRef.current = null;
    }
    hostPlayingRef.current = false;
    releaseMusicDuck();
  }, [playing, releaseMusicDuck]);

  useEffect(() => () => {
    if (newsBedPulseTimerRef.current) {
      window.clearInterval(newsBedPulseTimerRef.current);
      newsBedPulseTimerRef.current = null;
    }
    if (speakScheduleTimerRef.current) {
      window.clearTimeout(speakScheduleTimerRef.current);
      speakScheduleTimerRef.current = null;
    }
    if (ttsAudioRef.current) {
      try { ttsAudioRef.current.pause(); } catch (_) {}
      ttsAudioRef.current = null;
    }
    stopNewsBed();
    releaseMusicDuck();
  }, [releaseMusicDuck, stopNewsBed]);

  return null;
}
