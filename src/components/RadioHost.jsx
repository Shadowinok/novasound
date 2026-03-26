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
    releaseMusicDuck
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

  const speakLine = (text, rate = '+0%') => {
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
      const freqs = [174.61, 220, 261.63];
      const nodes = freqs.map((f) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = f;
        const g = ctx.createGain();
        g.gain.value = 0.0001;
        osc.connect(g);
        g.connect(master);
        osc.start();
        return { osc, gain: g };
      });
      newsBedCtxRef.current = ctx;
      newsBedMasterGainRef.current = master;
      newsBedNodesRef.current = nodes;
      const now = ctx.currentTime;
      nodes.forEach((n, i) => {
        n.gain.gain.cancelScheduledValues(now);
        n.gain.gain.linearRampToValueAtTime(0.012 + (i * 0.003), now + 1.2);
      });
      master.gain.cancelScheduledValues(now);
      master.gain.linearRampToValueAtTime(0.06, now + 1.4);
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
    if (!isRadioMode) return;
    if (!playing) return;
    if (!activeNow) return;
    const trackKey = playbackSlotKey;
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

    const nextTitle = effectiveNext.title || 'следующая песня';
    const nextAuthorRaw = effectiveNext.author?.username || '—';
    const nextAuthorSpoken = transcribeNickToSpokenRu(nextAuthorRaw);
    const randPick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const chance = (p) => Math.random() < p;
    const newsTitle = String(bestTitle).slice(0, 120);

    const trackTitleNorm = String(nextTitle || '').trim() || 'следующий трек';
    const includeAuthor = chance(0.42);
    const trackWithMaybeAuthor = includeAuthor
      ? `${trackTitleNorm}, автор ${nextAuthorSpoken}`
      : trackTitleNorm;
    const announceWithDjLead = chance(0.24);
    const djSelfTemplates = [
      'С вами ДИДЖЕЙ ИИ.',
      'У микрофона ваш ДИДЖЕЙ ИИ.',
      'Как всегда на связи ваш ДИДЖЕЙ ИИ.',
      'В эфире ваш ДИДЖЕЙ ИИ.'
    ];

    const trackLeadTemplates = [
      `Дальше у нас ${trackWithMaybeAuthor}.`,
      `Следом в эфире ${trackWithMaybeAuthor}.`,
      `Сейчас поставлю ${trackWithMaybeAuthor}.`,
      `Лови следующий трек: ${trackWithMaybeAuthor}.`,
      `На очереди ${trackWithMaybeAuthor}.`,
      `Следующей мы послушаем ${trackWithMaybeAuthor}.`
    ];

    const trackPunTemplates = [
      `Если название “${trackTitleNorm}”, значит настроение уже выбрано за нас.`,
      `У трека “${trackTitleNorm}” вайб как у пятницы: появляется внезапно и вовремя.`,
      `Судя по названию “${trackTitleNorm}”, сегодня будет не скучно.`,
      `Название “${trackTitleNorm}” звучит как план на вечер. План одобряю.`
    ];

    const lightTalkTemplates = [
      'Я тут проверил атмосферу в эфире: всё стабильно, музыка лечит.',
      'Короткий техперерыв на мысль: хороший трек иногда лучше длинного объяснения.',
      'В эфире всё по классике: меньше суеты, больше звука.',
      'Сегодня играем без лишнего шума, только то, что цепляет.'
    ];

    const stationIdTemplates = [
      'NovaSound Radio на связи. Держим курс на хорошие треки.',
      'Ты в эфире NovaSound Radio. Продолжаем музыкальное путешествие.',
      'NovaSound Radio в деле. Без пафоса, зато с правильным вайбом.'
    ];

    const newsJokeTemplates = [
      `В ленте пишут: “${newsTitle}”. Звучит так уверенно, что я почти поверил.`,
      `Новости шепнули: “${newsTitle}”. Уровень драмы приличный, берём в эфир.`,
      `Поймал заголовок: “${newsTitle}”. Комментарий один: красиво сказано.`
    ];
    const shortIronicFacts = [
      'Интересный факт: будильник всегда звонит на самом интересном месте сна.',
      'Маленькое наблюдение: очередь в магазине двигается быстрее в соседней кассе.',
      'Факт дня: если танцевать дома, это уже кардио, а значит почти спорт.',
      'Короткий факт: чай остывает ровно до того момента, когда ты решил его выпить.',
      'Наблюдение: самые важные мысли приходят, когда телефон остался в другой комнате.'
    ];

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
        `За окном ${wd}, ${day} ${month}.`
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
      const pct = minPct + (span ? (seed % (span + 1)) : 0);
      return `+${pct}%`;
    };
    const pickFormat = () => {
      if (forceFormat) return forceFormat;
      const now = Date.now();
      const canNewsBlock = hostCandidates.length > 0 && (now - lastNewsBlockAtRef.current) >= (60 * 60 * 1000);
      if (canNewsBlock && chance(0.65)) return 'news-block';
      const roll = Math.random();
      if (roll < 0.55) return 'track-intro';
      if (roll < 0.8) return 'light-talk';
      if (roll < 0.95) return 'news-joke';
      return 'id-jingle';
    };

    const format = pickFormat();
    const scriptLines = [];
    if (episodeLine && chance(0.45)) scriptLines.push(episodeLine);

    if (format === 'news-block') {
      lastNewsBlockAtRef.current = Date.now();
      lastFormatRef.current = 'news-block';
      scriptLines.push(randPick([
        'Всем привет, с вами ДИДЖЕЙ ИИ.',
        'И как всегда с вами ДИДЖЕЙ ИИ, привет.',
        'Привет, у микрофона ваш ДИДЖЕЙ ИИ.',
        'На связи ДИДЖЕЙ ИИ, всем привет.'
      ]));
      scriptLines.push(buildDatePhrase());
      scriptLines.push(buildWeatherPhrase());
      scriptLines.push(randPick([
        'А дальше у нас новости.',
        'И теперь новости.',
        'И у нас новостной блок.',
        'Переходим в блок новостей.'
      ]));
      scriptLines.push(`В ленте обсуждают: “${newsTitle}”.`);
      scriptLines.push(randPick([
        'Это был новостной блок, а теперь возвращаемся к музыке.',
        'На этом с новостями всё, продолжаем эфир.',
        'Новости на паузу, треки на максимум.'
      ]));
      if (chance(0.45)) scriptLines.push(randPick(shortIronicFacts));
      if (announceWithDjLead) scriptLines.push(randPick(djSelfTemplates));
      scriptLines.push(randPick(trackLeadTemplates));
    } else if (format === 'news-joke' && hostCandidates.length) {
      lastFormatRef.current = 'news-joke';
      scriptLines.push(randPick(newsJokeTemplates));
      scriptLines.push(randPick(trackLeadTemplates));
    } else if (format === 'id-jingle') {
      lastFormatRef.current = 'id-jingle';
      scriptLines.push(randPick(stationIdTemplates));
      scriptLines.push(randPick(trackLeadTemplates));
    } else if (format === 'light-talk') {
      lastFormatRef.current = 'light-talk';
      scriptLines.push(randPick(lightTalkTemplates));
      scriptLines.push(randPick(trackLeadTemplates));
    } else {
      lastFormatRef.current = 'track-intro';
      if (announceWithDjLead) scriptLines.push(randPick(djSelfTemplates));
      scriptLines.push(randPick(trackLeadTemplates));
      if (chance(0.55)) scriptLines.push(randPick(trackPunTemplates));
    }

    if (lastFormatRef.current !== 'news-block' && chance(0.08) && hostCandidates.length) {
      scriptLines.push(`Кстати, в ленте мелькнул заголовок: “${newsTitle}”.`);
    }
    if (lastFormatRef.current !== 'news-block' && chance(0.12)) {
      scriptLines.push(randPick(shortIronicFacts));
    }

    try {
      if (hostPlayingRef.current) return;
      hostPlayingRef.current = true;
      if (forceFormat === 'news-block') startNewsBed();
      applyMusicDuck(duckFactor);
      // Один запрос вместо серии фраз: меньше сетевых пауз между репликами.
      const fullScript = scriptLines
        .map((line) => String(line || '').trim())
        .filter(Boolean)
        .join(' ');
      const played = await speakLine(fullScript, pickRateByVibe());
      if (played) {
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
    releaseMusicDuck,
    startNewsBed,
    stopNewsBed,
    volume,
    djEpisode,
    setDjEpisode
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
    if (roll < 0.3) {
      delayMs = 700;
      duckFactor = 0.1;
    } else if (roll < 0.5) {
      delayMs = 650;
      duckFactor = 0.01;
    } else if (roll < 0.7) {
      delayMs = Math.max(450, Math.min(14000, (remainingSec - 2.2) * 1000));
      duckFactor = 0.09;
    } else {
      delayMs = Math.max(450, Math.min(14000, (remainingSec - 6.0) * 1000));
      duckFactor = 0.09;
    }
    if (!Number.isFinite(delayMs) || delayMs < 0) delayMs = 700;
    speakScheduleTimerRef.current = window.setTimeout(() => {
      speakScheduleTimerRef.current = null;
      void speakHostForTrack({ duckFactor });
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
      // Узкое окно старта блока "по часам".
      if (now.getSeconds() > 8) return;
      const hourKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}`;
      if (lastHourlyNewsKeyRef.current === hourKey) return;
      lastHourlyNewsKeyRef.current = hourKey;
      lastNewsBlockAtRef.current = Date.now();
      if (speakScheduleTimerRef.current) {
        window.clearTimeout(speakScheduleTimerRef.current);
        speakScheduleTimerRef.current = null;
      }
      void speakHostForTrack({ forceFormat: 'news-block', duckFactor: 0.02 });
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
