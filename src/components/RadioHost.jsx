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
    advanceRadioAfterHost,
    advanceRadioQueueAfterTrackEnd
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
  /** Защита от зависаний TTS: после таймаута сценарий принудительно завершаем. */
  const SPEAK_TIMEOUT_MS = 12000;
  /** Верхняя граница окна «захода» голоса на хвост трека (сек); внутри — случайный момент, не жёсткие 5 с каждый раз. */
  const HOST_OVERLAP_WINDOW_MAX_SEC = 5;
  /** Пауза «как на радио» между окончанием реплики и стартом следующей песни (мс). */
  const HOST_INTERTRACK_GAP_MS = 2500;
  const lastNewsBlockAtRef = useRef(0);
  const lastHourlyNewsKeyRef = useRef('');
  const lastFormatRef = useRef('');
  const speakScheduleTimerRef = useRef(null);
  const newsBedCtxRef = useRef(null);
  const newsBedMasterGainRef = useRef(null);
  const newsBedNodesRef = useRef([]);
  const newsBedPulseTimerRef = useRef(null);
  const newsBedAudioRef = useRef(null);
  const hostEventQueueRef = useRef([]);
  const hostEventBusyRef = useRef(false);
  const hostEventPumpTimerRef = useRef(null);
  const hostTrackCounterRef = useRef(0);
  /** Стол заказов в эфире: счётчик треков и настройки с публичного host-settings */
  const deskTrackCounterRef = useRef(0);
  const deskHostRef = useRef({ enabled: false, everySongs: 6 });
  const lastCountedSlotKeyRef = useRef('');
  const hostNextAfterTracksRef = useRef(2);
  const livePlaybackSlotKeyRef = useRef('');
  const liveIsRadioModeRef = useRef(false);
  const livePlayingRef = useRef(false);
  const lastAnnouncedBlockIdRef = useRef('');
  /**
   * Обычные реплики, стол, смена блока — строго после события `ended` (трек доигрывает до конца).
   * null | { trackId: string, payload: object }
   */
  const pendingAtTrackEndRef = useRef(null);
  const advanceRadioEndRef = useRef(advanceRadioQueueAfterTrackEnd);
  advanceRadioEndRef.current = advanceRadioQueueAfterTrackEnd;

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
      deskHostRef.current = {
        enabled: !!data?.requestDeskEnabled,
        everySongs: Math.max(1, Math.min(40, Number(data?.requestDeskEverySongs) || 6))
      };
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

  const getMskClockParts = () => {
    try {
      const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Moscow',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const parts = fmt.formatToParts(new Date());
      const pick = (type) => parts.find((p) => p.type === type)?.value || '';
      return {
        year: Number(pick('year')) || 0,
        month: Number(pick('month')) || 0,
        day: Number(pick('day')) || 0,
        hour: Number(pick('hour')) || 0,
        minute: Number(pick('minute')) || 0,
        second: Number(pick('second')) || 0
      };
    } catch (_) {
      const d = new Date();
      const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
      const msk = new Date(utcMs + (3 * 60 * 60000));
      return {
        year: msk.getFullYear(),
        month: msk.getMonth() + 1,
        day: msk.getDate(),
        hour: msk.getHours(),
        minute: msk.getMinutes(),
        second: msk.getSeconds()
      };
    }
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

  const startNewsBed = useCallback((bedOpts = {}) => {
    try {
      if (!liveIsRadioModeRef.current || !livePlayingRef.current) return;
      if (newsBedAudioRef.current) return;
      const bed = new Audio('/news-bed/breaking-news-intro.mp3');
      bed.loop = true;
      const vol = typeof bedOpts.volume === 'number' ? bedOpts.volume : 0.22;
      // Новости — чуть громче; межтрековый линк — тише, чтобы не давить эфир.
      bed.volume = Math.max(0.08, Math.min(0.35, vol));
      newsBedAudioRef.current = bed;
      const maybePromise = bed.play();
      if (maybePromise && typeof maybePromise.catch === 'function') {
        maybePromise.catch(() => {
          if (newsBedAudioRef.current === bed) newsBedAudioRef.current = null;
        });
      }
    } catch (_) {}
  }, []);

  const stopNewsBed = useCallback(() => {
    if (newsBedAudioRef.current) {
      try {
        newsBedAudioRef.current.pause();
        newsBedAudioRef.current.currentTime = 0;
      } catch (_) {}
      newsBedAudioRef.current = null;
    }
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
    const rawOpts = opts && typeof opts === 'object' ? opts : {};
    const useMusicBed = Boolean(rawOpts.useMusicBed);
    const runDeskAfter = Boolean(rawOpts.runDeskAfter);
    const includeMainHost = rawOpts.includeMainHost !== false;
    const afterNaturalTrackEnd = Boolean(rawOpts.afterNaturalTrackEnd);

    let merged = { ...rawOpts };
    if (rawOpts.pendingBlockSwitch) {
      const p = rawOpts.pendingBlockSwitch;
      merged = {
        ...merged,
        forceFormat: 'block-switch',
        prevBlockId: p.prevBlockId,
        nextBlockId: p.nextBlockId,
        pendingBlockSwitch: undefined
      };
    }

    const duckFactor = Math.max(0, Math.min(1, Number(merged.duckFactor ?? DUCK_MUSIC_FACTOR)));
    const forceFormat = String(merged.forceFormat || '');
    const announceMode = String(merged.announceMode || 'future');
    const pauseMusic = Boolean(merged.pauseMusic);
    const advanceToNextAfterSpeak = Boolean(merged.advanceToNextAfterSpeak);
    const allowNewsJoke = Boolean(merged.allowNewsJoke);

    if (!includeMainHost && !runDeskAfter) return;

    if (!includeMainHost && runDeskAfter && forceFormat !== 'news-block') {
      if (!isRadioMode || !activeNow) return;
      if (!afterNaturalTrackEnd && !playing) return;
      const trackKey = playbackSlotKey;
      const trackIdAtSpeakStart = currentTrackId;
      if (!trackKey || !trackIdAtSpeakStart) return;
      try {
        if (hostPlayingRef.current) return;
        hostPlayingRef.current = true;
        if (!afterNaturalTrackEnd && pauseMusic && isRadioMode) pauseForHost();
        if (useMusicBed) startNewsBed({ volume: 0.16 });
        const { data } = await client.post('/chat/desk/broadcast-claim');
        if (data && !data.skip && data.tts) {
          const playedDesk = await speakLine(String(data.tts), '+0%', {
            shouldAbortBeforePlay: () =>
              !liveIsRadioModeRef.current
              || (!afterNaturalTrackEnd && !livePlayingRef.current)
              || livePlaybackSlotKeyRef.current !== trackKey
          });
          if (playedDesk) lastSpokenKeyRef.current = trackKey;
        }
      } catch (_) {
      } finally {
        if (useMusicBed) stopNewsBed();
        if (afterNaturalTrackEnd) {
          await new Promise((r) => setTimeout(r, HOST_INTERTRACK_GAP_MS));
          releaseMusicDuck();
          hostPlayingRef.current = false;
        } else if (pauseMusic && isRadioMode) {
          if (advanceToNextAfterSpeak) {
            await new Promise((r) => setTimeout(r, HOST_INTERTRACK_GAP_MS));
            const moved = await advanceRadioAfterHost(trackIdAtSpeakStart);
            if (!moved) resumeAfterHost();
          } else {
            resumeAfterHost();
          }
        }
        if (!afterNaturalTrackEnd) releaseMusicDuck();
        if (!afterNaturalTrackEnd) hostPlayingRef.current = false;
      }
      return;
    }

    if (!isRadioMode) return;
    if (!afterNaturalTrackEnd && !playing) return;
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
      else if (roll < 0.93 && allowNewsJoke) variants.push('news-joke');
      else variants.push('id-jingle');
      if (allowNewsJoke) variants.push('track-intro', 'light-talk', 'program-list', 'news-joke', 'id-jingle');
      else variants.push('track-intro', 'light-talk', 'program-list', 'id-jingle');
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
      const prevBlockId = String(merged.prevBlockId || '');
      const nextBlockId = String(merged.nextBlockId || '');
      if (prevBlockId && nextBlockId && prevBlockId !== nextBlockId) {
        scriptLines.push(randPick([
          `Плавно выходим из блока «${blockLabel(prevBlockId)}».`,
          `Завершаем сегмент «${blockLabel(prevBlockId)}».`,
          `Смена эфирного настроения: закрываем «${blockLabel(prevBlockId)}».`
        ]));
      }
      if (nextBlockId) {
        scriptLines.push(randPick([
          `Переходим в «${blockLabel(nextBlockId)}».`,
          `Включаем режим «${blockLabel(nextBlockId)}».`,
          `Следующий участок эфира: «${blockLabel(nextBlockId)}».`
        ]));
      }
      if (announceMode === 'future') scriptLines.push(wrapWithFreshTrack(randPick(trackLeadFutureTemplates)));
      else scriptLines.push(randPick(trackLeadCurrentTemplates));
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

    if (lastFormatRef.current !== 'news-block' && chance(0.12)) {
      {
        const entry = pickPoolEntry('fact', randPick(shortIronicFacts));
        scriptLines.push(buildFactLine(fillVars(entry.text, {}, entry.cue), lastFormatRef.current === 'light-talk' ? 'playful' : 'neutral'));
      }
    }

    const isNewsBlockFmt = forceFormat === 'news-block';

    try {
      if (hostPlayingRef.current) return;
      hostPlayingRef.current = true;
      if (!afterNaturalTrackEnd && pauseMusic && isRadioMode && (useMusicBed || isNewsBlockFmt)) {
        pauseForHost();
      }
      if (isNewsBlockFmt) startNewsBed({ volume: 0.22 });
      else if (useMusicBed) startNewsBed({ volume: 0.16 });
      // Один запрос вместо серии фраз: меньше сетевых пауз между репликами.
      const fullScript = scriptLines
        .map((line) => String(line || '').trim())
        .filter(Boolean)
        .join(' ');
      let duckApplied = false;
      const isOutdatedSpeech = () => (
        !liveIsRadioModeRef.current
        || (!afterNaturalTrackEnd && !livePlayingRef.current)
        || !livePlaybackSlotKeyRef.current
        || livePlaybackSlotKeyRef.current !== trackKey
      );
      if (isOutdatedSpeech()) {
        hostPlayingRef.current = false;
        return;
      }
      let timeoutId = null;
      let timeoutDone = false;
      const timeoutPromise = new Promise((resolve) => {
        timeoutId = window.setTimeout(() => {
          timeoutDone = true;
          if (ttsAudioRef.current) {
            try { ttsAudioRef.current.pause(); } catch (_) {}
            ttsAudioRef.current = null;
          }
          resolve(false);
        }, SPEAK_TIMEOUT_MS);
      });
      const played = await Promise.race([
        speakLine(fullScript, pickRateByVibe(), {
          shouldAbortBeforePlay: isOutdatedSpeech,
          onPlaybackStart: () => {
            if (isOutdatedSpeech()) return;
            if (!afterNaturalTrackEnd && pauseMusic && isRadioMode && !useMusicBed && !isNewsBlockFmt) {
              pauseForHost();
            }
            if (duckApplied) return;
            duckApplied = true;
            if (!afterNaturalTrackEnd && !(pauseMusic && isRadioMode && (useMusicBed || isNewsBlockFmt))) {
              applyMusicDuck(duckFactor);
            }
          }
        }),
        timeoutPromise
      ]);
      if (!timeoutDone && timeoutId) {
        window.clearTimeout(timeoutId);
      }
      let deskPlayed = false;
      if (runDeskAfter) {
        try {
          const { data } = await client.post('/chat/desk/broadcast-claim');
          if (data && !data.skip && data.tts) {
            deskPlayed = await speakLine(String(data.tts), pickRateByVibe(), {
              shouldAbortBeforePlay: isOutdatedSpeech,
              onPlaybackStart: () => {}
            });
          }
        } catch (_) {}
      }
      if (played || deskPlayed) {
        lastSpokenKeyRef.current = trackKey;
      }
      if (played) {
        if (shouldAnnounceEpisode) {
          lastEpisodeAnnouncedRef.current = epId;
        }
      }
      if (played) {
        if (newsItemsForBlock.length) {
          const nextSpoken = [...spokenTitlesRef.current, ...newsItemsForBlock].slice(-12);
          spokenTitlesRef.current = nextSpoken;
        } else if (best?.title) {
          const nextSpoken = [...spokenTitlesRef.current, String(best.title || '')].slice(-12);
          spokenTitlesRef.current = nextSpoken;
        }
      }
    } catch (_) {
      // TTS недоступен
    } finally {
      if (afterNaturalTrackEnd) {
        releaseMusicDuck();
        if (isNewsBlockFmt || useMusicBed) stopNewsBed();
        await new Promise((r) => setTimeout(r, HOST_INTERTRACK_GAP_MS));
        hostPlayingRef.current = false;
      } else {
        if (pauseMusic && isRadioMode) {
          if (advanceToNextAfterSpeak) {
            await new Promise((r) => setTimeout(r, HOST_INTERTRACK_GAP_MS));
            const moved = await advanceRadioAfterHost(trackIdAtSpeakStart);
            if (!moved) resumeAfterHost();
          } else {
            resumeAfterHost();
          }
        }
        releaseMusicDuck();
        if (isNewsBlockFmt || useMusicBed) stopNewsBed();
        hostPlayingRef.current = false;
      }
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

  const processNextHostEvent = useCallback(async () => {
    if (hostEventBusyRef.current) return;
    if (!isRadioMode || !playing || !playbackSlotKey) return;
    const queueItems = Array.isArray(hostEventQueueRef.current) ? hostEventQueueRef.current : [];
    if (!queueItems.length) return;
    hostEventBusyRef.current = true;
    try {
      queueItems.sort((a, b) => {
        const pa = Number(a?.priority) || 0;
        const pb = Number(b?.priority) || 0;
        if (pa !== pb) return pb - pa;
        return (Number(a?.createdAt) || 0) - (Number(b?.createdAt) || 0);
      });
      const next = queueItems.shift();
      hostEventQueueRef.current = queueItems;
      if (!next) return;
      if (String(next.slotKey || '') !== playbackSlotKey) return;
      await speakHostForTrack(next.payload || {});
    } finally {
      hostEventBusyRef.current = false;
    }
  }, [isRadioMode, playbackSlotKey, playing, speakHostForTrack]);

  useEffect(() => {
    const onRadioTrackEnded = (e) => {
      if (!isRadioMode) return;
      const endedId = e.detail?.endedId;
      if (!endedId) return;
      const pending = pendingAtTrackEndRef.current;
      if (!pending || String(pending.trackId) !== String(endedId)) {
        if (pending && String(pending.trackId) !== String(endedId)) {
          pendingAtTrackEndRef.current = null;
        }
        return;
      }
      e.preventDefault();
      pendingAtTrackEndRef.current = null;
      const { payload } = pending;
      void (async () => {
        try {
          await speakHostForTrack(payload);
        } catch (_) {
          /* реплика не обязана всегда состояться */
        }
        await advanceRadioEndRef.current(endedId);
      })();
    };
    window.addEventListener('novasound_radio_track_ended', onRadioTrackEnded);
    return () => window.removeEventListener('novasound_radio_track_ended', onRadioTrackEnded);
  }, [isRadioMode, speakHostForTrack]);

  const enqueueHostEvent = useCallback((event) => {
    const item = event && typeof event === 'object' ? event : null;
    if (!item) return;
    const slotKey = String(item.slotKey || playbackSlotKey || '');
    const dedupeKey = String(item.dedupeKey || `${item.type || 'event'}:${slotKey}`);
    const queueItems = Array.isArray(hostEventQueueRef.current) ? hostEventQueueRef.current : [];
    if (queueItems.some((x) => String(x?.dedupeKey || '') === dedupeKey)) return;
    queueItems.push({
      type: String(item.type || 'generic'),
      priority: Number.isFinite(Number(item.priority)) ? Number(item.priority) : 1,
      createdAt: Date.now(),
      slotKey,
      dedupeKey,
      payload: item.payload || {}
    });
    hostEventQueueRef.current = queueItems;
    if (hostEventPumpTimerRef.current) return;
    hostEventPumpTimerRef.current = window.setTimeout(() => {
      hostEventPumpTimerRef.current = null;
      void processNextHostEvent();
    }, 0);
  }, [playbackSlotKey, processNextHostEvent]);

  /**
   * Программное прерывание эфира: часовые новости — в случайный момент последних ~5 с трека (пауза + фон + TTS).
   * Обычные реплики ведущего не используют этот планировщик — только после полного окончания трека.
   */
  const scheduleHourlyNewsInterrupt = useCallback(() => {
    if (speakScheduleTimerRef.current) {
      window.clearTimeout(speakScheduleTimerRef.current);
      speakScheduleTimerRef.current = null;
    }
    const dur = Number(duration || currentTrack?.duration || 0);
    const prog = Number(progress || 0);
    const remainingSec = Math.max(0, dur - prog);
    const latestStart = Math.max(0.08, Math.min(HOST_OVERLAP_WINDOW_MAX_SEC, remainingSec - 0.06));
    const earliestStart = Math.min(latestStart, Math.max(0.1, latestStart * 0.25));
    const rEarly = earliestStart + Math.random() * Math.max(0.01, latestStart - earliestStart);
    let delayMs = Math.round(Math.max(0, remainingSec - rEarly) * 1000);
    delayMs = Math.max(40, delayMs);

    const slotKeyAtSchedule = playbackSlotKey;
    speakScheduleTimerRef.current = window.setTimeout(() => {
      speakScheduleTimerRef.current = null;
      enqueueHostEvent({
        type: 'inter-track',
        priority: 100,
        slotKey: slotKeyAtSchedule,
        dedupeKey: `hour-news:${slotKeyAtSchedule}:${Date.now()}`,
        payload: {
          forceFormat: 'news-block',
          includeMainHost: true,
          runDeskAfter: false,
          duckFactor: 0,
          announceMode: 'future',
          pauseMusic: true,
          advanceToNextAfterSpeak: true,
          allowNewsJoke: true,
          useMusicBed: false,
          afterNaturalTrackEnd: false
        }
      });
    }, delayMs);
  }, [currentTrack?.duration, duration, progress, playbackSlotKey, enqueueHostEvent]);

  useEffect(() => {
    if (!isRadioMode || !playing || !playbackSlotKey) return;
    // На новом треке сбрасываем неисполненные старые события.
    hostEventQueueRef.current = [];
    if (lastCountedSlotKeyRef.current === playbackSlotKey) return;
    lastCountedSlotKeyRef.current = playbackSlotKey;
    hostTrackCounterRef.current += 1;

    const dh = deskHostRef.current;
    let deskDue = false;
    if (dh.enabled) {
      deskTrackCounterRef.current += 1;
      if (deskTrackCounterRef.current >= dh.everySongs) {
        deskTrackCounterRef.current = 0;
        deskDue = true;
      }
    } else {
      deskTrackCounterRef.current = 0;
    }

    let hostDue = false;
    if (hostTrackCounterRef.current >= hostNextAfterTracksRef.current) {
      hostTrackCounterRef.current = 0;
      hostDue = true;
      const mode = hostSchedule.mode === 'random' ? 'random' : 'fixed';
      if (mode === 'random') {
        const min = Math.max(1, Number(hostSchedule.randomMinSongs) || 2);
        const max = Math.max(min, Number(hostSchedule.randomMaxSongs) || 5);
        hostNextAfterTracksRef.current = Math.floor(min + Math.random() * (max - min + 1));
      } else {
        hostNextAfterTracksRef.current = Math.max(1, Number(hostSchedule.fixedEverySongs) || 2);
      }
    }

    if (!hostDue && !deskDue) return;
    const tid = currentTrackId;
    if (!tid) return;

    const baseEndPayload = {
      includeMainHost: false,
      runDeskAfter: false,
      duckFactor: 0,
      announceMode: 'future',
      pauseMusic: false,
      advanceToNextAfterSpeak: false,
      allowNewsJoke: true,
      useMusicBed: true,
      afterNaturalTrackEnd: true
    };
    const cur = pendingAtTrackEndRef.current;
    const payload =
      cur && cur.trackId === tid
        ? { ...cur.payload }
        : { ...baseEndPayload };
    payload.includeMainHost = Boolean(payload.includeMainHost) || hostDue;
    payload.runDeskAfter = Boolean(payload.runDeskAfter) || deskDue;
    pendingAtTrackEndRef.current = { trackId: tid, payload };
  }, [currentTrackId, isRadioMode, playing, playbackSlotKey, hostSchedule]);

  useEffect(() => {
    const nextId = String(currentTimeBlock?.id || '');
    if (!nextId) return;
    const prevId = String(lastAnnouncedBlockIdRef.current || '');
    if (!prevId) {
      lastAnnouncedBlockIdRef.current = nextId;
      return;
    }
    if (prevId === nextId) return;
    if (isRadioMode && playing && playbackSlotKey && currentTrackId) {
      const tid = String(currentTrackId);
      const baseEndPayload = {
        includeMainHost: false,
        runDeskAfter: false,
        duckFactor: 0,
        announceMode: 'future',
        pauseMusic: false,
        advanceToNextAfterSpeak: false,
        allowNewsJoke: true,
        useMusicBed: true,
        afterNaturalTrackEnd: true
      };
      const cur = pendingAtTrackEndRef.current;
      const payload =
        cur && cur.trackId === tid
          ? { ...cur.payload, includeMainHost: true, pendingBlockSwitch: { prevBlockId: prevId, nextBlockId: nextId } }
          : {
              ...baseEndPayload,
              includeMainHost: true,
              pendingBlockSwitch: { prevBlockId: prevId, nextBlockId: nextId }
            };
      pendingAtTrackEndRef.current = { trackId: tid, payload };
    }
    lastAnnouncedBlockIdRef.current = nextId;
  }, [currentTimeBlock, currentTrackId, isRadioMode, playbackSlotKey, playing]);

  useEffect(() => {
    if (playing) return;
    if (speakScheduleTimerRef.current) {
      window.clearTimeout(speakScheduleTimerRef.current);
      speakScheduleTimerRef.current = null;
    }
    hostEventQueueRef.current = [];
  }, [playing]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!isRadioMode || !playing) return;
      if (hostPlayingRef.current) return;
      const now = getMskClockParts();
      if (now.minute !== 0) return;
      // Стартуем в начале часа; расширяем окно, чтобы не пропускать блок при фоне вкладки.
      if (now.second > 45) return;
      const hourKey = `${now.year}-${now.month}-${now.day}-${now.hour}`;
      if (lastHourlyNewsKeyRef.current === hourKey) return;
      lastHourlyNewsKeyRef.current = hourKey;
      lastNewsBlockAtRef.current = Date.now();
      if (speakScheduleTimerRef.current) {
        window.clearTimeout(speakScheduleTimerRef.current);
        speakScheduleTimerRef.current = null;
      }
      scheduleHourlyNewsInterrupt();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRadioMode, playing, scheduleHourlyNewsInterrupt]);

  useEffect(() => {
    if (!isRadioMode || !playing) return;
    if (hostPlayingRef.current) return;
    if (hostEventBusyRef.current) return;
    if (!hostEventQueueRef.current.length) return;
    void processNextHostEvent();
  }, [isRadioMode, playing, playbackSlotKey, processNextHostEvent]);

  useEffect(() => {
    if (isRadioMode && playing) return;
    if (ttsAudioRef.current) {
      try { ttsAudioRef.current.pause(); } catch (_) {}
      ttsAudioRef.current = null;
    }
    hostPlayingRef.current = false;
    hostEventBusyRef.current = false;
    stopNewsBed();
    releaseMusicDuck();
  }, [isRadioMode, playing, releaseMusicDuck, stopNewsBed]);

  useEffect(() => () => {
    if (newsBedPulseTimerRef.current) {
      window.clearInterval(newsBedPulseTimerRef.current);
      newsBedPulseTimerRef.current = null;
    }
    if (speakScheduleTimerRef.current) {
      window.clearTimeout(speakScheduleTimerRef.current);
      speakScheduleTimerRef.current = null;
    }
    if (hostEventPumpTimerRef.current) {
      window.clearTimeout(hostEventPumpTimerRef.current);
      hostEventPumpTimerRef.current = null;
    }
    hostEventQueueRef.current = [];
    if (ttsAudioRef.current) {
      try { ttsAudioRef.current.pause(); } catch (_) {}
      ttsAudioRef.current = null;
    }
    stopNewsBed();
    releaseMusicDuck();
  }, [releaseMusicDuck, stopNewsBed]);

  return null;
}
