import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { chat as chatApi, users as usersApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import './Chat.css';

export default function Chat() {
  const { user, isAdmin, isModerator } = useAuth();
  const canMod = Boolean(isModerator);
  const [searchParams, setSearchParams] = useSearchParams();
  const dmHandledRef = useRef(null);

  const [tab, setTab] = useState('chat');
  const [requestDeskEnabled, setRequestDeskEnabled] = useState(false);
  const [channels, setChannels] = useState([]);
  const [channelId, setChannelId] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [deskText, setDeskText] = useState('');
  const [error, setError] = useState('');
  const [deskError, setDeskError] = useState('');
  const [loading, setLoading] = useState(true);
  const [adminRequests, setAdminRequests] = useState([]);

  const [dmModalOpen, setDmModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [dmQuery, setDmQuery] = useState('');
  const [dmResults, setDmResults] = useState([]);
  const [groupTitle, setGroupTitle] = useState('');
  const [groupQuery, setGroupQuery] = useState('');
  const [groupResults, setGroupResults] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [groupError, setGroupError] = useState('');
  const [chatReports, setChatReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState('');

  const loadSettings = useCallback(async () => {
    try {
      const { data } = await chatApi.settings();
      setRequestDeskEnabled(!!data?.requestDeskEnabled);
    } catch {
      setRequestDeskEnabled(false);
    }
  }, []);

  const loadMessages = useCallback(async () => {
    if (!channelId) return;
    try {
      const { data } = await chatApi.messages(channelId, { limit: 80 });
      setMessages(Array.isArray(data) ? data : []);
      setError('');
    } catch (e) {
      setError(e?.response?.data?.message || 'Не удалось загрузить сообщения');
    }
  }, [channelId]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadSettings();
      if (cancelled) return;
      try {
        const { data } = await chatApi.channels();
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setChannels(list);
        const gen = list.find((c) => c.type === 'general');
        const hasDm =
          typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('dm');
        if (gen && !hasDm) setChannelId(String(gen._id));
      } catch (e) {
        setError(e?.response?.data?.message || 'Не удалось загрузить чаты');
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loadSettings]);

  useEffect(() => {
    if (user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadSettings();
      if (cancelled) return;
      try {
        const { data } = await chatApi.generalChannel();
        if (cancelled) return;
        if (data?._id) setChannelId(String(data._id));
      } catch {
        setChannelId('');
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loadSettings]);

  useEffect(() => {
    if (!user) return;
    const t = setInterval(async () => {
      try {
        const { data } = await chatApi.channels();
        setChannels(Array.isArray(data) ? data : []);
      } catch {
        setChannels([]);
      }
    }, 10000);
    return () => clearInterval(t);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const dmId = searchParams.get('dm');
    if (!dmId) {
      dmHandledRef.current = null;
      return;
    }
    if (dmHandledRef.current === dmId) return;
    dmHandledRef.current = dmId;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await chatApi.openDm(dmId);
        if (cancelled) return;
        setChannelId(String(data._id));
        setSearchParams({}, { replace: true });
        const { data: list } = await chatApi.channels();
        if (!cancelled) setChannels(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!cancelled) {
          setError(e?.response?.data?.message || 'Не удалось открыть личные сообщения');
          dmHandledRef.current = null;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, searchParams, setSearchParams]);

  useEffect(() => {
    if (!user || !channels.length || !channelId) return;
    const exists = channels.some((c) => String(c._id) === String(channelId));
    if (!exists) {
      const gen = channels.find((c) => c.type === 'general');
      if (gen) setChannelId(String(gen._id));
    }
  }, [user, channels, channelId]);

  useEffect(() => {
    if (!channelId || tab !== 'chat') return;
    loadMessages();
    const t = setInterval(loadMessages, 5000);
    return () => clearInterval(t);
  }, [channelId, tab, loadMessages]);

  useEffect(() => {
    if (!dmModalOpen || !dmQuery.trim()) {
      setDmResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { data } = await usersApi.search(dmQuery.trim());
        setDmResults(Array.isArray(data) ? data : []);
      } catch {
        setDmResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [dmQuery, dmModalOpen]);

  useEffect(() => {
    if (!groupModalOpen || !groupQuery.trim()) {
      setGroupResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { data } = await usersApi.search(groupQuery.trim());
        setGroupResults(Array.isArray(data) ? data : []);
      } catch {
        setGroupResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [groupQuery, groupModalOpen]);

  const sendChat = async (e) => {
    e.preventDefault();
    if (!user) return;
    const t = text.trim();
    if (!t || !channelId) return;
    setError('');
    try {
      await chatApi.sendMessage(channelId, t);
      setText('');
      await loadMessages();
    } catch (err) {
      setError(err?.response?.data?.message || 'Не отправлено');
    }
  };

  const sendDesk = async (e) => {
    e.preventDefault();
    if (!user) return;
    const t = deskText.trim();
    if (!t) return;
    setDeskError('');
    try {
      await chatApi.sendRequest(t);
      setDeskText('');
    } catch (err) {
      setDeskError(err?.response?.data?.message || 'Не отправлено');
    }
  };

  const loadAdminRequests = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data } = await chatApi.requests('pending');
      setAdminRequests(Array.isArray(data) ? data : []);
    } catch {
      setAdminRequests([]);
    }
  }, [isAdmin]);

  const loadChatReports = useCallback(async () => {
    if (!canMod) return;
    setReportsLoading(true);
    setReportsError('');
    try {
      const { data } = await chatApi.reports('open');
      setChatReports(Array.isArray(data) ? data : []);
    } catch (e) {
      setReportsError(e?.response?.data?.message || 'Не удалось загрузить жалобы');
      setChatReports([]);
    } finally {
      setReportsLoading(false);
    }
  }, [canMod]);

  useEffect(() => {
    if (tab !== 'desk' || !isAdmin) return;
    loadAdminRequests();
    const t = setInterval(loadAdminRequests, 8000);
    return () => clearInterval(t);
  }, [tab, isAdmin, loadAdminRequests]);

  useEffect(() => {
    if (tab !== 'chat-reports' || !canMod) return;
    loadChatReports();
    const t = setInterval(loadChatReports, 15000);
    return () => clearInterval(t);
  }, [tab, canMod, loadChatReports]);

  const pickRandom = async () => {
    try {
      await chatApi.pickRandomRequest();
      await loadAdminRequests();
    } catch (e) {
      setDeskError(e?.response?.data?.message || 'Нет заявок');
    }
  };

  const setReqStatus = async (id, status) => {
    try {
      await chatApi.updateRequestStatus(id, status);
      await loadAdminRequests();
    } catch (_) {}
  };

  const reportMessage = async (messageId) => {
    if (!user || !messageId) return;
    setError('');
    try {
      await chatApi.reportMessage(messageId);
      // eslint-disable-next-line no-alert
      window.alert('Жалоба отправлена');
    } catch (e) {
      setError(e?.response?.data?.message || 'Не удалось отправить жалобу');
    }
  };

  const deleteChatMessage = async (messageId) => {
    if (!canMod || !messageId) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm('Удалить это сообщение?')) return;
    setError('');
    try {
      await chatApi.deleteMessage(messageId);
      await loadMessages();
    } catch (e) {
      setError(e?.response?.data?.message || 'Не удалось удалить');
    }
  };

  const muteAuthor = async (authorId, username) => {
    if (!canMod || !authorId) return;
    // eslint-disable-next-line no-alert
    const raw = window.prompt(`Мут пользователя ${username || ''} (часы, 1–168):`, '24');
    if (raw == null) return;
    const hours = parseInt(String(raw).trim(), 10);
    if (!Number.isFinite(hours) || hours < 1 || hours > 168) {
      setError('Укажите число часов от 1 до 168');
      return;
    }
    setError('');
    try {
      await chatApi.muteUser(authorId, hours);
      // eslint-disable-next-line no-alert
      window.alert('Мут выдан');
    } catch (e) {
      setError(e?.response?.data?.message || 'Не удалось выдать мут');
    }
  };

  const resolveChatReport = async (reportId) => {
    if (!canMod || !reportId) return;
    setReportsError('');
    try {
      await chatApi.updateReport(reportId, { status: 'resolved' });
      setChatReports((prev) => prev.filter((r) => String(r._id) !== String(reportId)));
    } catch (e) {
      setReportsError(e?.response?.data?.message || 'Не удалось закрыть жалобу');
    }
  };

  const openDmFromModal = async (u) => {
    setError('');
    try {
      const { data } = await chatApi.openDm(u._id);
      setDmModalOpen(false);
      setDmQuery('');
      setDmResults([]);
      const { data: list } = await chatApi.channels();
      setChannels(Array.isArray(list) ? list : []);
      setChannelId(String(data._id));
    } catch (e) {
      setError(e?.response?.data?.message || 'Не удалось открыть личные сообщения');
    }
  };

  const addGroupMember = (u) => {
    if (String(u._id) === String(user?._id)) return;
    setGroupMembers((prev) => {
      if (prev.some((m) => String(m._id) === String(u._id))) return prev;
      return [...prev, { _id: u._id, username: u.username }];
    });
    setGroupQuery('');
    setGroupResults([]);
  };

  const removeGroupMember = (id) => {
    setGroupMembers((prev) => prev.filter((m) => String(m._id) !== String(id)));
  };

  const submitGroup = async (e) => {
    e.preventDefault();
    setGroupError('');
    const title = groupTitle.trim();
    if (title.length < 2 || title.length > 120) {
      setGroupError('Название: от 2 до 120 символов');
      return;
    }
    const memberIds = groupMembers.map((m) => m._id);
    if (memberIds.length < 1) {
      setGroupError('Добавьте хотя бы одного участника');
      return;
    }
    try {
      const { data } = await chatApi.createGroup(title, memberIds);
      setGroupModalOpen(false);
      setGroupTitle('');
      setGroupMembers([]);
      setGroupQuery('');
      const { data: list } = await chatApi.channels();
      setChannels(Array.isArray(list) ? list : []);
      if (data?._id) setChannelId(String(data._id));
    } catch (err) {
      setGroupError(err?.response?.data?.message || 'Не удалось создать группу');
    }
  };

  const activeChannel = user ? channels.find((c) => String(c._id) === String(channelId)) : null;
  const channelTabLabel = (ch) => {
    if (ch.displayTitle) return ch.displayTitle;
    if (ch.type === 'dm' && ch.peer?.username) return ch.peer.username;
    return ch.title || 'Чат';
  };

  return (
    <motion.div className="chat-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="page-title">Чат</h1>
      <p className="chat-lead">
        Общий чат эфира. Плеер из чата не управляется — только общение и{' '}
        {requestDeskEnabled
          ? 'окно заказов, когда оно включено администратором.'
          : 'пожелания, когда стол заказов включён в админке.'}
      </p>

      <div className="chat-tabs">
        <button type="button" className={tab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}>
          Общий чат
        </button>
        {requestDeskEnabled && (
          <button type="button" className={tab === 'desk' ? 'active' : ''} onClick={() => setTab('desk')}>
            Окно заказа
          </button>
        )}
        {canMod && (
          <button type="button" className={tab === 'chat-reports' ? 'active' : ''} onClick={() => setTab('chat-reports')}>
            Жалобы на сообщения
          </button>
        )}
      </div>

      {loading && <div className="chat-loading">Загрузка...</div>}

      {!loading && tab === 'chat' && (
        <div className="chat-panel">
          {user && (
            <div className="chat-channel-toolbar">
              <div className="chat-channel-row" role="tablist" aria-label="Каналы чата">
                {channels.map((ch) => (
                  <button
                    key={String(ch._id)}
                    type="button"
                    role="tab"
                    aria-selected={String(channelId) === String(ch._id)}
                    className={`chat-channel-tab ${String(channelId) === String(ch._id) ? 'is-active' : ''}`}
                    onClick={() => setChannelId(String(ch._id))}
                  >
                    {channelTabLabel(ch)}
                  </button>
                ))}
              </div>
              <div className="chat-channel-actions">
                <button type="button" className="chat-btn-secondary" onClick={() => setDmModalOpen(true)}>
                  + ЛС
                </button>
                <button type="button" className="chat-btn-secondary" onClick={() => setGroupModalOpen(true)}>
                  + Группа
                </button>
              </div>
            </div>
          )}

          {error && <div className="chat-err">{error}</div>}

          {user && activeChannel && (
            <p className="chat-active-hint">
              {activeChannel.type === 'dm' && activeChannel.peer
                ? `Личный чат с ${activeChannel.peer.username}`
                : activeChannel.type === 'group'
                  ? `Группа: ${activeChannel.displayTitle || activeChannel.title || 'Группа'}`
                  : 'Общий чат эфира'}
            </p>
          )}

          <div className="chat-messages">
            {messages.map((m) => (
              <div key={m._id} className="chat-msg">
                <span className="chat-msg-user">{m.author?.username || '?'}</span>
                <span className="chat-msg-time">
                  {m.createdAt ? new Date(m.createdAt).toLocaleString('ru-RU') : ''}
                </span>
                <div className="chat-msg-text">{m.text}</div>
                {(user || canMod) && (
                  <div className="chat-msg-actions">
                    {user && (
                      <button type="button" className="chat-msg-action" onClick={() => reportMessage(m._id)}>
                        Пожаловаться
                      </button>
                    )}
                    {canMod && (
                      <>
                        <button type="button" className="chat-msg-action chat-msg-action--mod" onClick={() => deleteChatMessage(m._id)}>
                          Удалить
                        </button>
                        {m.author?._id ? (
                          <button
                            type="button"
                            className="chat-msg-action chat-msg-action--mod"
                            onClick={() => muteAuthor(m.author._id, m.author?.username)}
                          >
                            Мут автора
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
            {!messages.length && (
              <p className="chat-empty">Пока нет сообщений — будьте первым.</p>
            )}
          </div>
          {user ? (
            <form className="chat-form" onSubmit={sendChat}>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Сообщение..."
                maxLength={2000}
                autoComplete="off"
              />
              <button type="submit" disabled={!text.trim()}>
                Отправить
              </button>
            </form>
          ) : (
            <p className="chat-guest-hint">
              <Link to="/login">Войдите</Link>, чтобы писать в чат.
            </p>
          )}
        </div>
      )}

      {dmModalOpen && (
        <div
          className="chat-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dm-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDmModalOpen(false);
          }}
        >
          <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
            <h2 id="dm-modal-title" className="chat-modal-title">
              Новое личное сообщение
            </h2>
            <input
              type="search"
              className="chat-modal-input"
              placeholder="Поиск по имени пользователя..."
              value={dmQuery}
              onChange={(e) => setDmQuery(e.target.value)}
              autoFocus
            />
            <ul className="chat-modal-list">
              {dmResults.map((u) => (
                <li key={String(u._id)}>
                  <button type="button" className="chat-modal-pick" onClick={() => openDmFromModal(u)}>
                    {u.username}
                  </button>
                </li>
              ))}
            </ul>
            {!dmResults.length && dmQuery.trim() && <p className="chat-modal-empty">Никого не найдено</p>}
            <div className="chat-modal-footer">
              <button type="button" className="chat-btn-secondary" onClick={() => setDmModalOpen(false)}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {groupModalOpen && (
        <div
          className="chat-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="group-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setGroupModalOpen(false);
          }}
        >
          <div className="chat-modal chat-modal--wide" onClick={(e) => e.stopPropagation()}>
            <h2 id="group-modal-title" className="chat-modal-title">
              Новая группа
            </h2>
            <form onSubmit={submitGroup}>
              <label className="chat-modal-label" htmlFor="group-title-input">
                Название (2–120 символов)
              </label>
              <input
                id="group-title-input"
                type="text"
                className="chat-modal-input"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
                maxLength={120}
                placeholder="Название группы"
              />
              <label className="chat-modal-label" htmlFor="group-search-input">
                Добавить участников
              </label>
              <input
                id="group-search-input"
                type="search"
                className="chat-modal-input"
                placeholder="Поиск по имени..."
                value={groupQuery}
                onChange={(e) => setGroupQuery(e.target.value)}
              />
              <ul className="chat-modal-list">
                {groupResults.map((u) => (
                  <li key={String(u._id)}>
                    <button type="button" className="chat-modal-pick" onClick={() => addGroupMember(u)}>
                      {u.username} — добавить
                    </button>
                  </li>
                ))}
              </ul>
              {groupMembers.length > 0 && (
                <ul className="chat-group-members">
                  {groupMembers.map((m) => (
                    <li key={String(m._id)}>
                      <span>{m.username}</span>
                      <button type="button" className="chat-group-remove" onClick={() => removeGroupMember(m._id)}>
                        Убрать
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {groupError && <div className="chat-err">{groupError}</div>}
              <div className="chat-modal-footer">
                <button type="submit" className="chat-modal-submit">
                  Создать
                </button>
                <button type="button" className="chat-btn-secondary" onClick={() => setGroupModalOpen(false)}>
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!loading && tab === 'chat-reports' && canMod && (
        <div className="chat-panel chat-panel--reports">
          <p className="chat-desk-hint">Открытые жалобы на сообщения. Закрытие не удаляет сообщение автоматически.</p>
          {reportsError && <div className="chat-err">{reportsError}</div>}
          {reportsLoading ? (
            <div className="chat-loading">Загрузка...</div>
          ) : !chatReports.length ? (
            <p className="chat-empty">Нет открытых жалоб</p>
          ) : (
            <ul className="chat-report-list">
              {chatReports.map((r) => (
                <li key={r._id} className="chat-report-item">
                  <div className="chat-report-meta">
                    {r.reporter?.username || '?'} · {r.createdAt ? new Date(r.createdAt).toLocaleString('ru-RU') : ''}
                  </div>
                  <div className="chat-report-text">{r.textSnapshot || '—'}</div>
                  <button type="button" className="chat-btn-secondary" onClick={() => resolveChatReport(r._id)}>
                    Закрыть жалобу
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!loading && tab === 'desk' && requestDeskEnabled && (
        <div className="chat-panel chat-panel--desk">
          <p className="chat-desk-hint">
            Напишите исполнителя и трек или короткий комментарий. ЗЕРО периодически забирает заявку в эфир (если стол
            включён и есть очередь); отдельно админ может вести очередь вручную ниже.
          </p>
          {deskError && <div className="chat-err">{deskError}</div>}
          {user ? (
            <form className="chat-form" onSubmit={sendDesk}>
              <input
                type="text"
                value={deskText}
                onChange={(e) => setDeskText(e.target.value)}
                placeholder="Например: Artist — Track name"
                maxLength={500}
              />
              <button type="submit" disabled={!deskText.trim()}>
                В очередь
              </button>
            </form>
          ) : (
            <p className="chat-guest-hint">
              <Link to="/login">Войдите</Link>, чтобы оставить пожелание.
            </p>
          )}

          {isAdmin && (
            <div className="chat-admin-queue">
              <h2 className="section-title">Очередь (админ)</h2>
              <div className="chat-admin-actions">
                <button type="button" className="chat-btn-secondary" onClick={pickRandom}>
                  Случайная заявка
                </button>
              </div>
              <ul className="chat-req-list">
                {adminRequests.map((r) => (
                  <li key={r._id} className="chat-req-item">
                    <div className="chat-req-text">{r.text}</div>
                    <div className="chat-req-meta">
                      {r.user?.username || '?'} · {r.status}
                    </div>
                    <div className="chat-req-actions">
                      <button type="button" onClick={() => setReqStatus(r._id, 'picked')}>
                        В эфир
                      </button>
                      <button type="button" onClick={() => setReqStatus(r._id, 'skipped')}>
                        Пропуск
                      </button>
                      <button type="button" onClick={() => setReqStatus(r._id, 'played')}>
                        Сыграно
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              {!adminRequests.length && <p className="chat-empty">Очередь пуста</p>}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
