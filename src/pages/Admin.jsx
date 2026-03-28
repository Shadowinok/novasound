import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import client from '../api/client';
import { admin as adminApi, playlists as playlistsApi, chat as chatApi } from '../api/client';
import TrackCard from '../components/TrackCard';
import { coverImageBackgroundStyle } from '../utils/coverImage';

export default function Admin() {
  const [pending, setPending] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [users, setUsers] = useState([]);
  const [trackReports, setTrackReports] = useState([]);
  const [tab, setTab] = useState('moderation');
  const [comment, setComment] = useState('');
  const [userReason, setUserReason] = useState('Нарушение правил сервиса');
  const [deletingUserId, setDeletingUserId] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [adminReportMessage, setAdminReportMessage] = useState('');
  const [resolvingReportId, setResolvingReportId] = useState('');
  const [adminComments, setAdminComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [annSaving, setAnnSaving] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annMessageText, setAnnMessageText] = useState('');
  const [annTrackId, setAnnTrackId] = useState('');
  const [annPinned, setAnnPinned] = useState(false);
  const [annPinnedOrder, setAnnPinnedOrder] = useState(100);
  const [annExpiresAt, setAnnExpiresAt] = useState('');
  const [annEditingId, setAnnEditingId] = useState(null);
  const [pendingCovers, setPendingCovers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [plTitle, setPlTitle] = useState('');
  const [plDescription, setPlDescription] = useState('');
  const [plCoverFile, setPlCoverFile] = useState(null);
  const [plCoverInputKey, setPlCoverInputKey] = useState(0);
  const [plEditingId, setPlEditingId] = useState(null);
  const [plFeaturedOnHome, setPlFeaturedOnHome] = useState(false);
  const [plFeaturedOrder, setPlFeaturedOrder] = useState(100);
  const [plSaving, setPlSaving] = useState(false);
  const [plFormOk, setPlFormOk] = useState('');
  const [plFormErr, setPlFormErr] = useState('');
  const [plScope, setPlScope] = useState('editorial');
  const [plHomeFilter, setPlHomeFilter] = useState('all');
  const [hostCfgMode, setHostCfgMode] = useState('fixed');
  const [hostCfgFixedEverySongs, setHostCfgFixedEverySongs] = useState(2);
  const [hostCfgRandomMinSongs, setHostCfgRandomMinSongs] = useState(2);
  const [hostCfgRandomMaxSongs, setHostCfgRandomMaxSongs] = useState(5);
  const [hostCfgPlaylistMode, setHostCfgPlaylistMode] = useState('random');
  const [hostCfgDjTheme, setHostCfgDjTheme] = useState('auto');
  const [hostCfgSaving, setHostCfgSaving] = useState(false);
  const [hostCfgRequestDesk, setHostCfgRequestDesk] = useState(false);
  const [hostCfgDeskEverySongs, setHostCfgDeskEverySongs] = useState(6);
  const [hostCfgDeskMinInterval, setHostCfgDeskMinInterval] = useState(4);
  const [hostCfgDeskBanterChance, setHostCfgDeskBanterChance] = useState(0.22);
  const [hostCfgDeskIntro, setHostCfgDeskIntro] = useState('');
  const [hostCfgDeskBody, setHostCfgDeskBody] = useState('Пишет {user}: {text}.');
  const [hostCfgDeskOutro, setHostCfgDeskOutro] = useState('');
  const [hostCfgDeskBanterTpl, setHostCfgDeskBanterTpl] = useState('');
  const [chatMessageReports, setChatMessageReports] = useState([]);
  const [roleUpdatingId, setRoleUpdatingId] = useState('');
  const [campaignsList, setCampaignsList] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignsSaving, setCampaignsSaving] = useState(false);
  const [campaignMessage, setCampaignMessage] = useState('');
  const [campaignEditingId, setCampaignEditingId] = useState(null);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignSlug, setCampaignSlug] = useState('');
  const [campaignType, setCampaignType] = useState('track_week');
  const [campaignStatus, setCampaignStatus] = useState('draft');
  const [campaignStartsAt, setCampaignStartsAt] = useState('');
  const [campaignEndsAt, setCampaignEndsAt] = useState('');
  const [campaignRulesText, setCampaignRulesText] = useState('');
  const [campaignHostIntroText, setCampaignHostIntroText] = useState('');
  const [campaignHostOutroText, setCampaignHostOutroText] = useState('');
  const [campaignAllowExistingTracks, setCampaignAllowExistingTracks] = useState(true);
  const [campaignAllowUploadOptIn, setCampaignAllowUploadOptIn] = useState(true);
  const [campaignSelectedId, setCampaignSelectedId] = useState('');
  const [campaignSubmissions, setCampaignSubmissions] = useState([]);
  const [campaignSubmissionsLoading, setCampaignSubmissionsLoading] = useState(false);
  const [campaignSubmissionNotes, setCampaignSubmissionNotes] = useState({});

  const fetchPending = () => {
    adminApi.pendingTracks().then((r) => setPending(r.data || [])).catch(() => setPending([]));
  };
  const fetchPlaylists = () => {
    adminApi.playlists(plScope).then((r) => setPlaylists(r.data || [])).catch(() => setPlaylists([]));
  };
  const fetchUsers = () => {
    adminApi.users().then((r) => setUsers(r.data || [])).catch(() => setUsers([]));
  };

  const fetchTrackReports = () => {
    adminApi.trackReports('open')
      .then((r) => setTrackReports(r.data || []))
      .catch(() => setTrackReports([]));
  };

  const resetCampaignForm = () => {
    setCampaignEditingId(null);
    setCampaignTitle('');
    setCampaignSlug('');
    setCampaignType('track_week');
    setCampaignStatus('draft');
    setCampaignStartsAt('');
    setCampaignEndsAt('');
    setCampaignRulesText('');
    setCampaignHostIntroText('');
    setCampaignHostOutroText('');
    setCampaignAllowExistingTracks(true);
    setCampaignAllowUploadOptIn(true);
  };

  const fetchCampaigns = () => {
    setCampaignsLoading(true);
    adminApi.campaigns.list()
      .then((r) => {
        const list = r?.data || [];
        setCampaignsList(list);
        if (!campaignSelectedId && list[0]?._id) setCampaignSelectedId(String(list[0]._id));
      })
      .catch(() => setCampaignsList([]))
      .finally(() => setCampaignsLoading(false));
  };

  const fetchCampaignSubmissions = (id) => {
    const campaignId = String(id || '');
    if (!campaignId) {
      setCampaignSubmissions([]);
      return;
    }
    setCampaignSubmissionsLoading(true);
    adminApi.campaigns.submissions(campaignId)
      .then((r) => setCampaignSubmissions(r?.data || []))
      .catch(() => setCampaignSubmissions([]))
      .finally(() => setCampaignSubmissionsLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    if (tab === 'moderation') {
      adminApi.pendingTracks().then((r) => setPending(r.data || [])).catch(() => setPending([])).finally(() => setLoading(false));
    } else if (tab === 'covers') {
      adminApi.coverPending()
        .then((r) => setPendingCovers(r.data || []))
        .catch(() => setPendingCovers([]))
        .finally(() => setLoading(false));
    } else if (tab === 'playlists') {
      adminApi.playlists(plScope).then((r) => setPlaylists(r.data || [])).catch(() => setPlaylists([])).finally(() => setLoading(false));
    } else if (tab === 'reports') {
      adminApi.trackReports('open')
        .then((r) => setTrackReports(r.data || []))
        .catch(() => setTrackReports([]))
        .finally(() => setLoading(false));
    } else if (tab === 'chat-reports') {
      chatApi
        .reports('open')
        .then((r) => setChatMessageReports(Array.isArray(r.data) ? r.data : []))
        .catch(() => setChatMessageReports([]))
        .finally(() => setLoading(false));
    } else if (tab === 'announcements') {
      adminApi.announcements
        .list()
        .then((r) => setAnnouncements(r.data || []))
        .catch(() => setAnnouncements([]))
        .finally(() => setLoading(false));
    } else if (tab === 'radio-host') {
      adminApi.radioHostSettings
        .get()
        .then((r) => {
          const data = r?.data || {};
          setHostCfgMode(data.mode === 'random' ? 'random' : 'fixed');
          setHostCfgFixedEverySongs(Math.max(1, Math.min(20, Number(data.fixedEverySongs) || 2)));
          const min = Math.max(1, Math.min(20, Number(data.randomMinSongs) || 2));
          const maxRaw = Math.max(1, Math.min(20, Number(data.randomMaxSongs) || 5));
          setHostCfgRandomMinSongs(min);
          setHostCfgRandomMaxSongs(Math.max(min, maxRaw));
          setHostCfgPlaylistMode(data.radioPlaylistMode === 'dj' ? 'dj' : 'random');
          setHostCfgDjTheme(String(data.djTheme || 'auto'));
          setHostCfgRequestDesk(!!data.requestDeskEnabled);
          setHostCfgDeskEverySongs(Math.max(1, Math.min(40, Number(data.requestDeskEverySongs) || 6)));
          setHostCfgDeskMinInterval(Math.max(1, Math.min(120, Number(data.requestDeskMinIntervalMinutes) || 4)));
          const bc = Number(data.requestDeskBanterChance);
          setHostCfgDeskBanterChance(Number.isFinite(bc) ? Math.min(1, Math.max(0, bc)) : 0.22);
          setHostCfgDeskIntro(String(data.deskIntroTemplate || ''));
          setHostCfgDeskBody(String(data.deskBodyTemplate || 'Пишет {user}: {text}.'));
          setHostCfgDeskOutro(String(data.deskOutroTemplate || ''));
          setHostCfgDeskBanterTpl(String(data.deskBanterTemplate || ''));
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else if (tab === 'campaigns') {
      setLoading(false);
      fetchCampaigns();
    } else {
      adminApi.users().then((r) => setUsers(r.data || [])).catch(() => setUsers([])).finally(() => setLoading(false));
    }
  }, [tab, plScope]);

  const handleApprove = (id) => {
    adminApi.approveTrack(id, comment).then(() => {
      setComment('');
      fetchPending();
    }).catch(() => {});
  };
  const handleReject = (id) => {
    adminApi.rejectTrack(id, comment).then(() => {
      setComment('');
      fetchPending();
    }).catch(() => {});
  };

  const handleApproveCover = (id) => {
    adminApi.approveCover(id).then(() => {
      setAdminMessage('Обложка опубликована');
      adminApi.coverPending().then((r) => setPendingCovers(r.data || [])).catch(() => {});
    }).catch((e) => setAdminMessage(e.response?.data?.message || 'Ошибка'));
  };

  const handleRejectCoverModeration = (id) => {
    if (!window.confirm('Отклонить новую обложку? Останется старая.')) return;
    adminApi.rejectCoverModeration(id, comment).then(() => {
      setComment('');
      setAdminMessage('Обложка отклонена');
      adminApi.coverPending().then((r) => setPendingCovers(r.data || [])).catch(() => {});
    }).catch((e) => setAdminMessage(e.response?.data?.message || 'Ошибка'));
  };
  const handleUserRoleChange = (u, newRole) => {
    if (!u?._id) return;
    const adminCount = users.filter((x) => x.role === 'admin').length;
    if (u.role === 'admin' && newRole !== 'admin' && adminCount <= 1) {
      setAdminMessage('Нельзя снять последнего администратора');
      return;
    }
    setRoleUpdatingId(String(u._id));
    setAdminMessage('');
    adminApi
      .setUserRole(u._id, newRole)
      .then((r) => {
        const row = r?.data;
        if (row?._id) {
          setUsers((prev) => prev.map((x) => (String(x._id) === String(row._id) ? { ...x, ...row } : x)));
        }
        setAdminMessage('Роль обновлена');
      })
      .catch((e) => setAdminMessage(e.response?.data?.message || 'Не удалось сменить роль'))
      .finally(() => setRoleUpdatingId(''));
  };

  const resolveChatMessageReport = (reportId) => {
    if (!reportId) return;
    setAdminMessage('');
    chatApi
      .updateReport(reportId, { status: 'resolved' })
      .then(() => {
        setChatMessageReports((prev) => prev.filter((x) => String(x._id) !== String(reportId)));
        setAdminMessage('Жалоба на сообщение закрыта');
      })
      .catch((e) => setAdminMessage(e.response?.data?.message || 'Ошибка'));
  };

  const handleDeleteUser = (id) => {
    if (!id) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm('Удалить аккаунт пользователя без возможности восстановления?')) return;
    setDeletingUserId(id);
    setAdminMessage('');
    adminApi.deleteUser(id, userReason)
      .then((r) => {
        setAdminMessage(r.data?.message || 'Пользователь удалён');
        fetchUsers();
      })
      .catch((e) => setAdminMessage(e.response?.data?.message || 'Ошибка удаления пользователя'))
      .finally(() => setDeletingUserId(''));
  };

  const resetPlaylistForm = (clearMessages = true) => {
    setPlTitle('');
    setPlDescription('');
    setPlCoverFile(null);
    setPlCoverInputKey((k) => k + 1);
    setPlEditingId(null);
    setPlFeaturedOnHome(false);
    setPlFeaturedOrder(100);
    if (clearMessages) {
      setPlFormOk('');
      setPlFormErr('');
    }
  };

  const startEditPlaylist = (p) => {
    setPlFormOk('');
    setPlFormErr('');
    setPlEditingId(p._id);
    setPlTitle(p.title || '');
    setPlDescription(p.description || '');
    setPlFeaturedOnHome(!!p.featuredOnHome);
    setPlFeaturedOrder(Number.isFinite(Number(p.featuredOrder)) ? Number(p.featuredOrder) : 100);
    setPlCoverFile(null);
    setPlCoverInputKey((k) => k + 1);
  };

  const handlePlaylistSubmit = (e) => {
    e.preventDefault();
    setPlFormOk('');
    setPlFormErr('');
    const title = plTitle.trim();
    if (!title) {
      setPlFormErr('Укажите название плейлиста');
      return;
    }
    const fd = new FormData();
    fd.append('title', title);
    fd.append('description', plDescription.trim());
    fd.append('featuredOnHome', plFeaturedOnHome ? 'true' : 'false');
    fd.append('featuredOrder', String(plFeaturedOrder));
    if (!plEditingId) {
      fd.append('tracks', JSON.stringify([]));
    }
    if (plCoverFile) fd.append('cover', plCoverFile);

    setPlSaving(true);
    const wasEdit = !!plEditingId;
    const req = plEditingId
      ? playlistsApi.update(plEditingId, fd)
      : playlistsApi.create(fd);
    req
      .then(() => {
        resetPlaylistForm(false);
        setPlFormErr('');
        setPlFormOk(wasEdit ? 'Плейлист сохранён' : 'Плейлист создан');
        fetchPlaylists();
      })
      .catch((err) => {
        const m =
          err.response?.data?.message
          || err.response?.data?.errors?.[0]?.msg
          || err.message
          || 'Ошибка сохранения';
        setPlFormErr(m);
      })
      .finally(() => setPlSaving(false));
  };

  const handleDeletePlaylist = (id, title) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Удалить плейлист «${title}»? Это действие необратимо.`)) return;
    setPlSaving(true);
    setPlFormOk('');
    setPlFormErr('');
    playlistsApi
      .delete(id)
      .then(() => {
        setPlFormOk('Плейлист удалён');
        setPlFormErr('');
        if (plEditingId === id) resetPlaylistForm(false);
        fetchPlaylists();
      })
      .catch((err) => setPlFormErr(err.response?.data?.message || 'Не удалось удалить'))
      .finally(() => setPlSaving(false));
  };

  const handleTogglePlaylistFeatured = (playlist) => {
    if (!playlist?._id) return;
    setPlSaving(true);
    setPlFormErr('');
    setPlFormOk('');
    playlistsApi
      .update(playlist._id, {
        featuredOnHome: !playlist.featuredOnHome,
        featuredOrder: Number.isFinite(Number(playlist.featuredOrder)) ? Number(playlist.featuredOrder) : 100
      })
      .then(() => {
        setPlFormOk(!playlist.featuredOnHome ? 'Плейлист добавлен на главную' : 'Плейлист убран с главной');
        fetchPlaylists();
      })
      .catch((err) => setPlFormErr(err.response?.data?.message || 'Не удалось обновить выбор для главной'))
      .finally(() => setPlSaving(false));
  };

  const handleSyncHybridPlaylists = () => {
    setPlSaving(true);
    setPlFormErr('');
    setPlFormOk('');
    adminApi
      .syncHybridPlaylists()
      .then((r) => {
        const autoCount = Array.isArray(r.data?.auto) ? r.data.auto.length : 0;
        const manualCount = Array.isArray(r.data?.manual) ? r.data.manual.length : 0;
        setPlFormOk(`Гибрид синхронизирован: авто ${autoCount}, ручные ${manualCount}`);
        fetchPlaylists();
      })
      .catch((err) => setPlFormErr(err.response?.data?.message || 'Не удалось синхронизировать гибрид'))
      .finally(() => setPlSaving(false));
  };

  const handleSyncMonthlyReleases = () => {
    setPlSaving(true);
    setPlFormErr('');
    setPlFormOk('');
    adminApi
      .syncMonthlyReleases()
      .then(() => {
        setPlFormOk('«Релизы месяца» синхронизированы');
        fetchPlaylists();
      })
      .catch((err) => setPlFormErr(err.response?.data?.message || 'Не удалось синхронизировать «Релизы месяца»'))
      .finally(() => setPlSaving(false));
  };

  const handleResolveReport = (reportId, action) => {
    if (!reportId) return;
    setResolvingReportId(reportId);
    setAdminReportMessage('');
    const adminComment = adminComments[reportId] || '';
    adminApi.resolveTrackReport(reportId, action, adminComment)
      .then((r) => {
        setAdminReportMessage(r.data?.message || 'Жалоба обработана');
        fetchTrackReports();
      })
      .catch((e) => setAdminReportMessage(e.response?.data?.message || 'Ошибка обработки жалобы'))
      .finally(() => setResolvingReportId(''));
  };

  const resetAnnouncementForm = (clearMessages = true) => {
    setAnnTitle('');
    setAnnMessageText('');
    setAnnTrackId('');
    setAnnPinned(false);
    setAnnPinnedOrder(100);
    setAnnExpiresAt('');
    setAnnEditingId(null);
    if (clearMessages) setAdminMessage('');
  };

  const startEditAnnouncement = (a) => {
    setAdminMessage('');
    setAnnEditingId(a?._id || null);
    setAnnTitle(a?.title || '');
    setAnnMessageText(a?.message || '');
    setAnnTrackId(a?.trackId ? String(a.trackId) : '');
    setAnnPinned(!!a?.pinned);
    setAnnPinnedOrder(Number.isFinite(Number(a?.pinnedOrder)) ? Number(a?.pinnedOrder) : 100);
    setAnnExpiresAt(a?.expiresAt ? new Date(a.expiresAt).toISOString().slice(0, 16) : '');
  };

  const upsertAnnouncement = (e) => {
    e.preventDefault();
    setAnnSaving(true);
    setAdminMessage('');

    const title = annTitle.trim();
    if (!title) {
      setAdminMessage('Укажите название анонса');
      setAnnSaving(false);
      return;
    }

    const payload = {
      title,
      message: annMessageText.trim(),
      trackId: annTrackId.trim() || null,
      pinned: annPinned,
      pinnedOrder: Number.isFinite(Number(annPinnedOrder)) ? Number(annPinnedOrder) : 100,
      expiresAt: annExpiresAt || null
    };

    const req = annEditingId ? adminApi.announcements.update(annEditingId, payload) : adminApi.announcements.create(payload);
    req
      .then(() => {
        setAdminMessage(annEditingId ? 'Анонс обновлён' : 'Анонс создан');
        resetAnnouncementForm(false);
        adminApi.announcements
          .list()
          .then((r) => setAnnouncements(r.data || []))
          .catch(() => setAnnouncements([]));
      })
      .catch((err) => {
        setAdminMessage(err.response?.data?.message || 'Ошибка сохранения анонса');
      })
      .finally(() => setAnnSaving(false));
  };

  const handleDeleteAnnouncement = (id) => {
    if (!id) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm('Удалить анонс?')) return;
    setAnnSaving(true);
    setAdminMessage('');
    adminApi.announcements
      .delete(id)
      .then(() => {
        setAdminMessage('Анонс удалён');
        resetAnnouncementForm(false);
        return adminApi.announcements.list();
      })
      .then((r) => setAnnouncements(r.data || []))
      .catch((err) => setAdminMessage(err.response?.data?.message || 'Не удалось удалить'))
      .finally(() => setAnnSaving(false));
  };

  const handleTogglePin = (a) => {
    if (!a?._id) return;
    setAnnSaving(true);
    setAdminMessage('');
    const nextPinned = !a.pinned;
    adminApi.announcements
      .update(a._id, { pinned: nextPinned })
      .then(() => adminApi.announcements.list())
      .then((r) => {
        setAnnouncements(r.data || []);
        setAdminMessage(nextPinned ? 'Анонс закреплён' : 'Анонс откреплён');
      })
      .catch((err) => setAdminMessage(err.response?.data?.message || 'Ошибка pin/unpin'))
      .finally(() => setAnnSaving(false));
  };

  const filteredUsers = useMemo(() => {
    const list = Array.isArray(users) ? users : [];
    const q = userSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u) => {
      const name = String(u.username || '').toLowerCase();
      const mail = String(u.email || '').toLowerCase();
      return name.includes(q) || mail.includes(q);
    });
  }, [users, userSearch]);

  const visiblePlaylists = useMemo(() => {
    if (plHomeFilter === 'featured') {
      return playlists.filter((p) => !!p.featuredOnHome);
    }
    return playlists;
  }, [playlists, plHomeFilter]);

  useEffect(() => {
    if (tab !== 'campaigns') return;
    fetchCampaignSubmissions(campaignSelectedId);
  }, [tab, campaignSelectedId]);

  const saveHostSettings = (e) => {
    e.preventDefault();
    const fixedEverySongs = Math.max(1, Math.min(20, Number(hostCfgFixedEverySongs) || 2));
    const randomMinSongs = Math.max(1, Math.min(20, Number(hostCfgRandomMinSongs) || 2));
    const randomMaxSongsRaw = Math.max(1, Math.min(20, Number(hostCfgRandomMaxSongs) || 5));
    const randomMaxSongs = Math.max(randomMinSongs, randomMaxSongsRaw);
    setHostCfgFixedEverySongs(fixedEverySongs);
    setHostCfgRandomMinSongs(randomMinSongs);
    setHostCfgRandomMaxSongs(randomMaxSongs);
    setHostCfgSaving(true);
    setAdminMessage('');
    adminApi.radioHostSettings
      .update({
        mode: hostCfgMode === 'random' ? 'random' : 'fixed',
        fixedEverySongs,
        randomMinSongs,
        randomMaxSongs,
        radioPlaylistMode: hostCfgPlaylistMode === 'dj' ? 'dj' : 'random',
        djTheme: hostCfgDjTheme,
        requestDeskEnabled: hostCfgRequestDesk,
        requestDeskEverySongs: Math.max(1, Math.min(40, Number(hostCfgDeskEverySongs) || 6)),
        requestDeskMinIntervalMinutes: Math.max(1, Math.min(120, Number(hostCfgDeskMinInterval) || 4)),
        requestDeskBanterChance: Math.min(1, Math.max(0, Number(hostCfgDeskBanterChance) || 0)),
        deskIntroTemplate: hostCfgDeskIntro,
        deskBodyTemplate: hostCfgDeskBody,
        deskOutroTemplate: hostCfgDeskOutro,
        deskBanterTemplate: hostCfgDeskBanterTpl
      })
      .then(() => setAdminMessage('Настройки ведущего сохранены'))
      .catch((err) => setAdminMessage(err.response?.data?.message || 'Не удалось сохранить настройки ведущего'))
      .finally(() => setHostCfgSaving(false));
  };

  const startEditCampaign = (c) => {
    setCampaignEditingId(c?._id || null);
    setCampaignTitle(c?.title || '');
    setCampaignSlug(c?.slug || '');
    setCampaignType(c?.type || 'track_week');
    setCampaignStatus(c?.status || 'draft');
    setCampaignStartsAt(c?.startsAt ? new Date(c.startsAt).toISOString().slice(0, 16) : '');
    setCampaignEndsAt(c?.endsAt ? new Date(c.endsAt).toISOString().slice(0, 16) : '');
    setCampaignRulesText(c?.rulesText || '');
    setCampaignHostIntroText(c?.hostIntroText || '');
    setCampaignHostOutroText(c?.hostOutroText || '');
    setCampaignAllowExistingTracks(c?.allowExistingTracks !== false);
    setCampaignAllowUploadOptIn(c?.allowUploadOptIn !== false);
    setCampaignMessage('');
  };

  const saveCampaign = (e) => {
    e.preventDefault();
    const title = campaignTitle.trim();
    if (title.length < 3) {
      setCampaignMessage('Название кампании должно быть не короче 3 символов');
      return;
    }
    const payload = {
      title,
      slug: campaignSlug.trim() || undefined,
      type: campaignType,
      status: campaignStatus,
      startsAt: campaignStartsAt || null,
      endsAt: campaignEndsAt || null,
      rulesText: campaignRulesText,
      hostIntroText: campaignHostIntroText,
      hostOutroText: campaignHostOutroText,
      allowExistingTracks: campaignAllowExistingTracks,
      allowUploadOptIn: campaignAllowUploadOptIn
    };
    setCampaignsSaving(true);
    setCampaignMessage('');
    const req = campaignEditingId
      ? adminApi.campaigns.update(campaignEditingId, payload)
      : adminApi.campaigns.create(payload);
    req
      .then((r) => {
        const id = String(r?.data?._id || campaignEditingId || '');
        setCampaignMessage(campaignEditingId ? 'Кампания обновлена' : 'Кампания создана');
        resetCampaignForm();
        fetchCampaigns();
        if (id) setCampaignSelectedId(id);
      })
      .catch((err) => setCampaignMessage(err.response?.data?.message || 'Ошибка сохранения кампании'))
      .finally(() => setCampaignsSaving(false));
  };

  const removeCampaign = (id) => {
    if (!id) return;
    if (!window.confirm('Удалить кампанию и её заявки?')) return;
    setCampaignsSaving(true);
    setCampaignMessage('');
    adminApi.campaigns.remove(id)
      .then(() => {
        setCampaignMessage('Кампания удалена');
        if (campaignSelectedId === id) setCampaignSelectedId('');
        fetchCampaigns();
        setCampaignSubmissions([]);
      })
      .catch((err) => setCampaignMessage(err.response?.data?.message || 'Не удалось удалить кампанию'))
      .finally(() => setCampaignsSaving(false));
  };

  const updateSubmissionStatus = (submissionId, status) => {
    const campaignId = String(campaignSelectedId || '');
    if (!campaignId || !submissionId) return;
    const note = campaignSubmissionNotes[submissionId] || '';
    setCampaignsSaving(true);
    setCampaignMessage('');
    adminApi.campaigns.updateSubmissionStatus(campaignId, submissionId, status, note)
      .then(() => {
        setCampaignMessage('Статус заявки обновлён');
        fetchCampaignSubmissions(campaignId);
      })
      .catch((err) => setCampaignMessage(err.response?.data?.message || 'Не удалось обновить заявку'))
      .finally(() => setCampaignsSaving(false));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page admin-page">
      <h2 className="page-title">Админ-панель</h2>
      <div className="admin-tabs">
        <button type="button" className={tab === 'moderation' ? 'active' : ''} onClick={() => setTab('moderation')}>Модерация треков</button>
        <button type="button" className={tab === 'covers' ? 'active' : ''} onClick={() => setTab('covers')}>Обложки</button>
        <button type="button" className={tab === 'playlists' ? 'active' : ''} onClick={() => setTab('playlists')}>Плейлисты</button>
        <button type="button" className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>Пользователи</button>
        <button type="button" className={tab === 'reports' ? 'active' : ''} onClick={() => setTab('reports')}>Жалобы на треки</button>
        <button type="button" className={tab === 'chat-reports' ? 'active' : ''} onClick={() => setTab('chat-reports')}>
          Жалобы в чат
        </button>
        <button type="button" className={tab === 'announcements' ? 'active' : ''} onClick={() => setTab('announcements')}>Анонсы</button>
        <button type="button" className={tab === 'radio-host' ? 'active' : ''} onClick={() => setTab('radio-host')}>Радио ведущий</button>
        <button type="button" className={tab === 'campaigns' ? 'active' : ''} onClick={() => setTab('campaigns')}>Кампании</button>
      </div>
      {tab === 'covers' && (
        <>
          <p className="admin-hint">Обложки с подозрительным именем файла (эвристика) — на ручную проверку.</p>
          {adminMessage && <div className="admin-message">{adminMessage}</div>}
          <input
            type="text"
            placeholder="Комментарий при отклонении обложки (опционально)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="admin-comment-input"
          />
          {loading ? (
            <div className="loading">Загрузка...</div>
          ) : pendingCovers.length === 0 ? (
            <div className="empty">Нет обложек на модерации</div>
          ) : (
            <div className="admin-pending-grid">
              {pendingCovers.map((track) => (
                <motion.div key={track._id} className="admin-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <TrackCard track={track} showStatus coverDisplayUrl={track.coverImagePending || track.coverImage} />
                  <div className="admin-card-actions">
                    <button type="button" className="admin-btn approve" onClick={() => handleApproveCover(track._id)}>Одобрить обложку</button>
                    <button type="button" className="admin-btn reject" onClick={() => handleRejectCoverModeration(track._id)}>Отклонить</button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
      {tab === 'moderation' && (
        <>
          <p className="admin-hint">Одобрите или отклоните треки. Можно добавить комментарий.</p>
          <input
            type="text"
            placeholder="Комментарий модератора (опционально)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="admin-comment-input"
          />
          {loading ? (
            <div className="loading">Загрузка...</div>
          ) : pending.length === 0 ? (
            <div className="empty">Нет треков на модерации</div>
          ) : (
            <div className="admin-pending-grid">
              {pending.map((track) => (
                <motion.div key={track._id} className="admin-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <TrackCard
                    track={track}
                    showStatus
                    coverDisplayUrl={track.coverImagePending || track.coverImage}
                  />
                  <div className="admin-card-actions">
                    <button type="button" className="admin-btn approve" onClick={() => handleApprove(track._id)}>Одобрить</button>
                    <button type="button" className="admin-btn reject" onClick={() => handleReject(track._id)}>Отклонить</button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
      {tab === 'playlists' && (
        <div className="admin-playlists">
          <p className="admin-hint">
            Только <strong>публичные</strong> подборки для главной и каталога. Обложка — jpg, png, webp (до 5 МБ). Треки добавляйте на сайте: откройте трек и нажмите «В плейлист», выберите этот плейлист (или создайте плейлист пустым и наполняйте позже).
          </p>
          <div className="admin-pl-scope-row">
            <label htmlFor="admin-pl-scope" className="admin-pl-scope-label">Показывать:</label>
            <select
              id="admin-pl-scope"
              value={plScope}
              onChange={(e) => setPlScope(e.target.value)}
              className="admin-pl-scope-select"
            >
              <option value="editorial">Только админские публичные</option>
              <option value="public">Все публичные</option>
              <option value="all">Все (включая личные)</option>
            </select>
            <button
              type="button"
              className="admin-btn admin-pl-hybrid-sync"
              onClick={handleSyncHybridPlaylists}
              disabled={plSaving}
            >
              {plSaving ? 'Синхронизируем...' : 'Синхронизировать гибрид'}
            </button>
            <button
              type="button"
              className="admin-btn admin-pl-monthly-sync"
              onClick={handleSyncMonthlyReleases}
              disabled={plSaving}
            >
              {plSaving ? 'Синхронизируем...' : 'Только релизы месяца'}
            </button>
            <select
              className="admin-pl-home-filter"
              value={plHomeFilter}
              onChange={(e) => setPlHomeFilter(e.target.value)}
            >
              <option value="all">Все плейлисты</option>
              <option value="featured">Только на главной</option>
            </select>
          </div>
          {plFormOk && <div className="admin-message">{plFormOk}</div>}
          {plFormErr && <div className="admin-pl-error">{plFormErr}</div>}
          <form className="admin-playlist-form" onSubmit={handlePlaylistSubmit}>
            <h3 className="admin-playlist-form-title">{plEditingId ? 'Редактировать плейлист' : 'Новый плейлист'}</h3>
            <label className="admin-pl-label">
              Название *
              <input
                type="text"
                className="admin-comment-input admin-pl-field"
                value={plTitle}
                onChange={(e) => setPlTitle(e.target.value)}
                placeholder="Название"
                maxLength={100}
                required
              />
            </label>
            <label className="admin-pl-label">
              Описание
              <textarea
                className="admin-comment-input admin-pl-textarea"
                value={plDescription}
                onChange={(e) => setPlDescription(e.target.value)}
                placeholder="Краткое описание (опционально)"
                rows={3}
                maxLength={1000}
              />
            </label>
            <label className="admin-pl-checkbox">
              <input
                type="checkbox"
                checked={plFeaturedOnHome}
                onChange={(e) => setPlFeaturedOnHome(e.target.checked)}
              />
              Показывать на главной
            </label>
            <label className="admin-pl-label">
              Порядок на главной (меньше = выше)
              <input
                type="number"
                min="0"
                max="9999"
                step="1"
                className="admin-comment-input admin-pl-field"
                value={plFeaturedOrder}
                onChange={(e) => setPlFeaturedOrder(Number(e.target.value || 0))}
              />
            </label>
            <label className="admin-pl-label">
              Обложка {plEditingId ? '(новый файл заменит текущую)' : '(опционально)'}
              <input
                key={plCoverInputKey}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                className="admin-pl-file"
                onChange={(e) => setPlCoverFile(e.target.files?.[0] || null)}
              />
            </label>
            <div className="admin-pl-form-actions">
              <button type="submit" className="admin-btn admin-pl-submit" disabled={plSaving}>
                {plSaving ? 'Сохранение...' : plEditingId ? 'Сохранить' : 'Создать плейлист'}
              </button>
              {plEditingId && (
                <button type="button" className="admin-btn admin-pl-cancel" onClick={() => resetPlaylistForm()}>
                  Отмена
                </button>
              )}
            </div>
          </form>
          {loading ? (
            <div className="loading">Загрузка...</div>
          ) : visiblePlaylists.length === 0 ? (
            <div className="empty">Плейлистов пока нет</div>
          ) : (
            <div className="admin-playlist-grid">
              {visiblePlaylists.map((p) => (
                <div key={p._id} className="admin-playlist-card">
                  <div
                    className="admin-playlist-card-cover"
                    style={coverImageBackgroundStyle(p.coverImage, p.updatedAt)}
                  />
                  <div className="admin-playlist-card-body">
                    <div className="admin-playlist-card-title">{p.title}</div>
                    <div className="admin-playlist-card-meta">
                      Треков: {Array.isArray(p.tracks) ? p.tracks.length : 0}
                      <span className="admin-pl-badge pub">В каталоге</span>
                      {p.featuredOnHome && <span className="admin-pl-badge home">На главной</span>}
                    </div>
                    <div className="admin-playlist-card-actions">
                      <Link to={`/playlist/${p._id}`} className="admin-pl-link" target="_blank" rel="noreferrer">
                        Открыть
                      </Link>
                      <button type="button" className="admin-btn admin-pl-edit" onClick={() => startEditPlaylist(p)}>
                        Редактировать
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-pl-feature"
                        onClick={() => handleTogglePlaylistFeatured(p)}
                        disabled={plSaving}
                      >
                        {p.featuredOnHome ? 'Убрать с главной' : 'На главную'}
                      </button>
                      <button
                        type="button"
                        className="admin-btn reject"
                        onClick={() => handleDeletePlaylist(p._id, p.title)}
                        disabled={plSaving}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {tab === 'users' && (
        <div className="admin-users">
          <p className="admin-hint">Удаление аккаунтов пользователей администратором.</p>
          <input
            type="search"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="admin-comment-input admin-user-search"
            placeholder="Поиск по имени или email…"
            autoComplete="off"
            aria-label="Поиск пользователя"
          />
          <input
            type="text"
            value={userReason}
            onChange={(e) => setUserReason(e.target.value)}
            className="admin-comment-input"
            placeholder="Причина удаления (уйдёт в письмо пользователю)"
          />
          {adminMessage && <div className="admin-message">{adminMessage}</div>}
          {loading ? (
            <div className="loading">Загрузка...</div>
          ) : users.length === 0 ? (
            <div className="empty">Пользователей пока нет</div>
          ) : filteredUsers.length === 0 ? (
            <div className="empty">Никого не найдено по запросу «{userSearch.trim()}»</div>
          ) : (
            <div className="users-table-wrap">
              <p className="admin-user-count">
                {userSearch.trim()
                  ? `Найдено: ${filteredUsers.length} из ${users.length}`
                  : `Всего: ${users.length}`}
              </p>
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Пользователь</th>
                    <th>Email</th>
                    <th>Роль</th>
                    <th>Статус</th>
                    <th>Создан</th>
                    <th>Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u._id}>
                      <td>{u.username}</td>
                      <td>{u.email}</td>
                      <td>
                        <select
                          className="admin-comment-input admin-user-role-select"
                          value={u.role || 'user'}
                          disabled={roleUpdatingId === String(u._id)}
                          onChange={(e) => handleUserRoleChange(u, e.target.value)}
                          aria-label={`Роль ${u.username}`}
                        >
                          <option value="user">user</option>
                          <option value="moderator">moderator</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td>{u.isBlocked ? 'Заблокирован' : 'Активен'}</td>
                      <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-btn reject"
                          disabled={deletingUserId === u._id}
                          onClick={() => handleDeleteUser(u._id)}
                        >
                          {deletingUserId === u._id ? 'Удаляем...' : 'Удалить'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {tab === 'reports' && (
        <div className="admin-reports">
          <p className="admin-hint">Жалобы от пользователей. Трек не скрывается сразу — решение принимает админ.</p>
          {adminReportMessage && <div className="admin-message">{adminReportMessage}</div>}
          {loading ? (
            <div className="loading">Загрузка...</div>
          ) : trackReports.length === 0 ? (
            <div className="empty">Жалоб пока нет</div>
          ) : (
            <div className="reports-table-wrap">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Тип</th>
                    <th>Трек</th>
                    <th>Автор</th>
                    <th>Жалобщик</th>
                    <th>Текст жалобы</th>
                    <th>Комментарий админа</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {trackReports.map((rep) => (
                    <tr key={rep._id}>
                      <td>{rep.reportType === 'cover' ? 'Обложка' : 'Контент'}</td>
                      <td>{rep.track?.title || '-'}</td>
                      <td>{rep.track?.author?.username || '-'}</td>
                      <td>{rep.reporter?.username || '-'}</td>
                      <td className="rep-text">
                        {rep.text}
                        <div className="rep-ai">AI: {rep.aiSuggestedAction || '-'}</div>
                        <div className="rep-ai">Попытка: {rep.attemptNumber || 1}/4</div>
                        <div className="rep-ai">Уникальных жалобщиков: {rep.uniqueReporters || 1}</div>
                      </td>
                      <td>
                        <textarea
                          className="rep-admin-comment"
                          rows={3}
                          value={adminComments[rep._id] || ''}
                          onChange={(e) => setAdminComments((prev) => ({ ...prev, [rep._id]: e.target.value }))}
                          placeholder="Опишите решение админа"
                        />
                      </td>
                      <td>
                        <div className="rep-actions">
                          <button
                            type="button"
                            className="admin-btn approve"
                            disabled={resolvingReportId === rep._id}
                            onClick={() => handleResolveReport(rep._id, 'leave')}
                          >
                            {resolvingReportId === rep._id ? '...' : 'Оставить'}
                          </button>
                          <button
                            type="button"
                            className="admin-btn reject"
                            disabled={resolvingReportId === rep._id}
                            onClick={() => handleResolveReport(rep._id, 'rejectTrack')}
                          >
                            {resolvingReportId === rep._id ? '...' : 'Отклонить трек'}
                          </button>
                          {rep.reportType === 'cover' && (
                            <button
                              type="button"
                              className="admin-btn reject"
                              disabled={resolvingReportId === rep._id}
                              onClick={() => handleResolveReport(rep._id, 'rejectCover')}
                            >
                              {resolvingReportId === rep._id ? '...' : 'Снять обложку'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {tab === 'chat-reports' && (
        <div className="admin-reports">
          <p className="admin-hint">Жалобы на сообщения в чате. Модераторы видят список во вкладке «Жалобы» на странице чата.</p>
          {adminMessage && <div className="admin-message">{adminMessage}</div>}
          {loading ? (
            <div className="loading">Загрузка...</div>
          ) : chatMessageReports.length === 0 ? (
            <div className="empty">Открытых жалоб на сообщения нет</div>
          ) : (
            <div className="reports-table-wrap">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Жалобщик</th>
                    <th>Текст (снимок)</th>
                    <th>Канал</th>
                    <th>Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {chatMessageReports.map((rep) => (
                    <tr key={rep._id}>
                      <td>{rep.createdAt ? new Date(rep.createdAt).toLocaleString('ru-RU') : '-'}</td>
                      <td>{rep.reporter?.username || '-'}</td>
                      <td className="rep-text">{rep.textSnapshot || '—'}</td>
                      <td>
                        {rep.channel?.type === 'general'
                          ? 'Общий'
                          : rep.channel?.title || rep.channel?.slug || String(rep.channel?._id || '')}
                      </td>
                      <td>
                        <button type="button" className="admin-btn approve" onClick={() => resolveChatMessageReport(rep._id)}>
                          Закрыть
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {tab === 'announcements' && (
        <div className="admin-announcements">
          <p className="admin-hint">Анонсы для главной. Можно закреплять и задавать срок жизни.</p>
          {adminMessage && <div className="admin-message">{adminMessage}</div>}
          <form className="admin-playlist-form admin-ann-form" onSubmit={upsertAnnouncement}>
            <h3 className="admin-playlist-form-title">{annEditingId ? 'Редактировать анонс' : 'Новый анонс'}</h3>
            <label className="admin-pl-label">
              Заголовок *
              <input
                type="text"
                className="admin-comment-input admin-pl-field"
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="Например: Скоро релиз..."
                maxLength={200}
                required
              />
            </label>
            <label className="admin-pl-label">
              Текст (опционально)
              <textarea
                className="admin-comment-input admin-pl-textarea"
                value={annMessageText}
                onChange={(e) => setAnnMessageText(e.target.value)}
                placeholder="Небольшое сообщение для главной (опционально)"
                rows={3}
                maxLength={2000}
              />
            </label>
            <label className="admin-pl-label">
              ID трека (опционально)
              <input
                type="text"
                className="admin-comment-input admin-pl-field"
                value={annTrackId}
                onChange={(e) => setAnnTrackId(e.target.value)}
                placeholder="Например: 664a... (если анонс ведёт на трек)"
              />
            </label>
            <label className="admin-pl-checkbox">
              <input
                type="checkbox"
                checked={annPinned}
                onChange={(e) => setAnnPinned(e.target.checked)}
              />
              Закрепить
            </label>
            <label className="admin-pl-label">
              Приоритет (меньше = выше)
              <input
                type="number"
                min="0"
                max="9999"
                step="1"
                className="admin-comment-input admin-pl-field"
                value={annPinnedOrder}
                onChange={(e) => setAnnPinnedOrder(Number(e.target.value || 0))}
              />
            </label>
            <label className="admin-pl-label">
              Срок жизни (опционально)
              <input
                type="datetime-local"
                className="admin-comment-input admin-pl-field"
                value={annExpiresAt}
                onChange={(e) => setAnnExpiresAt(e.target.value)}
              />
            </label>
            <div className="admin-pl-form-actions">
              <button type="submit" className="admin-btn admin-pl-submit" disabled={annSaving}>
                {annSaving ? 'Сохраняем...' : annEditingId ? 'Сохранить' : 'Создать'}
              </button>
              {annEditingId && (
                <button type="button" className="admin-btn admin-pl-cancel" onClick={() => resetAnnouncementForm()}>
                  Отмена
                </button>
              )}
            </div>
          </form>
          {loading ? (
            <div className="loading">Загрузка...</div>
          ) : announcements.length === 0 ? (
            <div className="empty">Анонсов пока нет</div>
          ) : (
            <div className="admin-ann-grid">
              {announcements.map((a) => (
                <div key={a._id} className="admin-ann-card">
                  <div className="admin-ann-card-top">
                    <div className="admin-ann-card-title">{a.title}</div>
                    <div className="admin-ann-meta">
                      {a.pinned ? <span className="admin-ann-badge home">Закреплён</span> : <span className="admin-ann-badge">Обычный</span>}
                      {a.createdBy?.username ? <span className="admin-ann-badge">Автор: {a.createdBy.username}</span> : null}
                      {a.expiresAt ? <span className="admin-ann-badge">До: {new Date(a.expiresAt).toLocaleString()}</span> : null}
                    </div>
                  </div>
                  {!!a.message && <div className="admin-ann-card-message">{a.message}</div>}
                  <div className="admin-ann-actions">
                    <button type="button" className="admin-btn admin-pl-edit" onClick={() => startEditAnnouncement(a)} disabled={annSaving}>
                      Редактировать
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-pl-feature"
                      onClick={() => handleTogglePin(a)}
                      disabled={annSaving}
                    >
                      {a.pinned ? 'Открепить' : 'Закрепить'}
                    </button>
                    <button
                      type="button"
                      className="admin-btn reject"
                      onClick={() => handleDeleteAnnouncement(a._id)}
                      disabled={annSaving}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {tab === 'radio-host' && (
        <div className="admin-announcements">
          <p className="admin-hint">Управление периодичностью реплик ведущего в радио-режиме (по трекам).</p>
          {adminMessage && <div className="admin-message">{adminMessage}</div>}
          {loading ? (
            <div className="loading">Загрузка...</div>
          ) : (
            <form className="admin-playlist-form admin-ann-form" onSubmit={saveHostSettings}>
              <h3 className="admin-playlist-form-title">Периодичность ведущего</h3>
              <label className="admin-pl-checkbox">
                <input
                  type="radio"
                  name="host-mode"
                  checked={hostCfgMode === 'fixed'}
                  onChange={() => setHostCfgMode('fixed')}
                />
                Жесткий интервал (каждые N песен)
              </label>
              {hostCfgMode === 'fixed' && (
                <div className="admin-pl-form-actions" style={{ marginTop: 8, marginBottom: 14 }}>
                  {[2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className="admin-btn admin-pl-submit"
                      onClick={() => setHostCfgFixedEverySongs(n)}
                      disabled={hostCfgSaving}
                      style={{ width: 88 }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
              <label className="admin-pl-label">
                N песен
                <input
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  className="admin-comment-input admin-pl-field"
                  value={hostCfgFixedEverySongs}
                  onChange={(e) => setHostCfgFixedEverySongs(Number(e.target.value || 1))}
                  disabled={hostCfgMode !== 'fixed'}
                />
              </label>
              <label className="admin-pl-checkbox">
                <input
                  type="radio"
                  name="host-mode"
                  checked={hostCfgMode === 'random'}
                  onChange={() => setHostCfgMode('random')}
                />
                Случайный диапазон (вразнобой)
              </label>
              {hostCfgMode === 'random' && (
                <div className="admin-pl-form-actions" style={{ marginTop: 8, marginBottom: 14 }}>
                  <button
                    type="button"
                    className="admin-btn admin-pl-submit"
                    onClick={() => {
                      setHostCfgRandomMinSongs(2);
                      setHostCfgRandomMaxSongs(5);
                    }}
                    disabled={hostCfgSaving}
                  >
                    2..5
                  </button>
                </div>
              )}
              <label className="admin-pl-label">
                Минимум песен
                <input
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  className="admin-comment-input admin-pl-field"
                  value={hostCfgRandomMinSongs}
                  onChange={(e) => setHostCfgRandomMinSongs(Number(e.target.value || 1))}
                  disabled={hostCfgMode !== 'random'}
                />
              </label>
              <label className="admin-pl-label">
                Максимум песен
                <input
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  className="admin-comment-input admin-pl-field"
                  value={hostCfgRandomMaxSongs}
                  onChange={(e) => setHostCfgRandomMaxSongs(Number(e.target.value || 1))}
                  disabled={hostCfgMode !== 'random'}
                />
              </label>
              <h3 className="admin-playlist-form-title" style={{ marginTop: 8 }}>Плейлист эфира</h3>
              <label className="admin-pl-checkbox">
                <input
                  type="radio"
                  name="playlist-mode"
                  checked={hostCfgPlaylistMode === 'random'}
                  onChange={() => setHostCfgPlaylistMode('random')}
                />
                Случайный эфир (общий рандом)
              </label>
              <label className="admin-pl-checkbox">
                <input
                  type="radio"
                  name="playlist-mode"
                  checked={hostCfgPlaylistMode === 'dj'}
                  onChange={() => setHostCfgPlaylistMode('dj')}
                />
                Выбор диджея (тематический вайб)
              </label>
              <label className="admin-pl-label">
                Тема/настроение диджея
                <select
                  className="admin-comment-input admin-pl-field"
                  value={hostCfgDjTheme}
                  onChange={(e) => setHostCfgDjTheme(e.target.value)}
                  disabled={hostCfgPlaylistMode !== 'dj'}
                >
                  <option value="auto">Авто (меняется по времени)</option>
                  <option value="mixed">Смешанный</option>
                  <option value="energetic">Энергичный</option>
                  <option value="chill">Спокойный</option>
                  <option value="night">Ночной</option>
                  <option value="rock">Рок</option>
                  <option value="pop">Поп</option>
                  <option value="electro">Электро</option>
                  <option value="hiphop">Хип-хоп</option>
                  <option value="jazz">Джаз</option>
                </select>
              </label>
              <h3 className="admin-playlist-form-title" style={{ marginTop: 8 }}>Стол заказов в эфире</h3>
              <label className="admin-pl-checkbox">
                <input
                  type="checkbox"
                  checked={hostCfgRequestDesk}
                  onChange={(e) => setHostCfgRequestDesk(e.target.checked)}
                />
                Стол заказов в чате (вкладка «Окно заказа»)
              </label>
              <p className="admin-hint" style={{ marginTop: 6, marginBottom: 10 }}>
                ЗЕРО забирает заявку в эфир по счётчику треков и минимальному интервалу между блоками (настраивается ниже).
                В шаблонах:{' '}
                <code>{'{user}'}</code>, <code>{'{text}'}</code> — для основного текста; в бантере — <code>{'{user}'}</code>.
              </p>
              <label className="admin-pl-label">
                Блок стола каждые N треков (в эфире)
                <input
                  type="number"
                  min="1"
                  max="40"
                  step="1"
                  className="admin-comment-input admin-pl-field"
                  value={hostCfgDeskEverySongs}
                  onChange={(e) => setHostCfgDeskEverySongs(Number(e.target.value || 1))}
                  disabled={!hostCfgRequestDesk}
                />
              </label>
              <label className="admin-pl-label">
                Мин. интервал между блоками стола (минуты, сервер)
                <input
                  type="number"
                  min="1"
                  max="120"
                  step="1"
                  className="admin-comment-input admin-pl-field"
                  value={hostCfgDeskMinInterval}
                  onChange={(e) => setHostCfgDeskMinInterval(Number(e.target.value || 1))}
                  disabled={!hostCfgRequestDesk}
                />
              </label>
              <label className="admin-pl-label">
                Вероятность короткой реплики (бантер), 0…1
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  className="admin-comment-input admin-pl-field"
                  value={hostCfgDeskBanterChance}
                  onChange={(e) => setHostCfgDeskBanterChance(Number(e.target.value))}
                  disabled={!hostCfgRequestDesk}
                />
              </label>
              <label className="admin-pl-label">
                Интро (можно пусто)
                <textarea
                  className="admin-comment-input admin-pl-textarea"
                  rows={2}
                  maxLength={500}
                  value={hostCfgDeskIntro}
                  onChange={(e) => setHostCfgDeskIntro(e.target.value)}
                  disabled={!hostCfgRequestDesk}
                  placeholder="Например: Слушаем пожелание из чата."
                />
              </label>
              <label className="admin-pl-label">
                Основной текст (шаблон)
                <textarea
                  className="admin-comment-input admin-pl-textarea"
                  rows={3}
                  maxLength={800}
                  value={hostCfgDeskBody}
                  onChange={(e) => setHostCfgDeskBody(e.target.value)}
                  disabled={!hostCfgRequestDesk}
                  placeholder="Пишет {user}: {text}."
                />
              </label>
              <label className="admin-pl-label">
                Аутро (можно пусто)
                <textarea
                  className="admin-comment-input admin-pl-textarea"
                  rows={2}
                  maxLength={500}
                  value={hostCfgDeskOutro}
                  onChange={(e) => setHostCfgDeskOutro(e.target.value)}
                  disabled={!hostCfgRequestDesk}
                />
              </label>
              <label className="admin-pl-label">
                Бантер (опционально, подстановка {'{user}'})
                <textarea
                  className="admin-comment-input admin-pl-textarea"
                  rows={2}
                  maxLength={300}
                  value={hostCfgDeskBanterTpl}
                  onChange={(e) => setHostCfgDeskBanterTpl(e.target.value)}
                  disabled={!hostCfgRequestDesk}
                  placeholder="Спасибо, {user}, что с нами!"
                />
              </label>
              <div className="admin-pl-form-actions">
                <button type="submit" className="admin-btn admin-pl-submit" disabled={hostCfgSaving}>
                  {hostCfgSaving ? 'Сохраняем...' : 'Сохранить настройки'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
      {tab === 'campaigns' && (
        <div className="admin-announcements">
          <p className="admin-hint">
            Универсальные кампании: конкурсные активности, ручной отбор заявок и тексты подводок ведущего.
          </p>
          {campaignMessage && <div className="admin-message">{campaignMessage}</div>}
          <form className="admin-playlist-form admin-ann-form" onSubmit={saveCampaign}>
            <h3 className="admin-playlist-form-title">{campaignEditingId ? 'Редактировать кампанию' : 'Новая кампания'}</h3>
            <label className="admin-pl-label">
              Название *
              <input
                type="text"
                className="admin-comment-input admin-pl-field"
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
                placeholder="Например: Трек недели"
                maxLength={140}
                required
              />
            </label>
            <label className="admin-pl-label">
              Slug (опционально)
              <input
                type="text"
                className="admin-comment-input admin-pl-field"
                value={campaignSlug}
                onChange={(e) => setCampaignSlug(e.target.value)}
                placeholder="track-week"
              />
            </label>
            <div className="admin-pl-form-actions">
              <label className="admin-pl-label" style={{ minWidth: 180 }}>
                Тип
                <select className="admin-comment-input admin-pl-field" value={campaignType} onChange={(e) => setCampaignType(e.target.value)}>
                  <option value="track_week">Трек недели</option>
                  <option value="challenge">Челлендж</option>
                  <option value="special">Спецкампания</option>
                </select>
              </label>
              <label className="admin-pl-label" style={{ minWidth: 180 }}>
                Статус
                <select className="admin-comment-input admin-pl-field" value={campaignStatus} onChange={(e) => setCampaignStatus(e.target.value)}>
                  <option value="draft">Черновик</option>
                  <option value="active">Активна</option>
                  <option value="closed">Закрыта</option>
                  <option value="archived">Архив</option>
                </select>
              </label>
            </div>
            <div className="admin-pl-form-actions">
              <label className="admin-pl-label" style={{ minWidth: 220 }}>
                Старт
                <input
                  type="datetime-local"
                  className="admin-comment-input admin-pl-field"
                  value={campaignStartsAt}
                  onChange={(e) => setCampaignStartsAt(e.target.value)}
                />
              </label>
              <label className="admin-pl-label" style={{ minWidth: 220 }}>
                Финиш
                <input
                  type="datetime-local"
                  className="admin-comment-input admin-pl-field"
                  value={campaignEndsAt}
                  onChange={(e) => setCampaignEndsAt(e.target.value)}
                />
              </label>
            </div>
            <label className="admin-pl-checkbox">
              <input type="checkbox" checked={campaignAllowUploadOptIn} onChange={(e) => setCampaignAllowUploadOptIn(e.target.checked)} />
              Показывать галочку конкурса в форме загрузки
            </label>
            <label className="admin-pl-checkbox">
              <input type="checkbox" checked={campaignAllowExistingTracks} onChange={(e) => setCampaignAllowExistingTracks(e.target.checked)} />
              Разрешать отправку уже опубликованных треков
            </label>
            <label className="admin-pl-label">
              Правила кампании
              <textarea className="admin-comment-input admin-pl-textarea" rows={3} value={campaignRulesText} onChange={(e) => setCampaignRulesText(e.target.value)} />
            </label>
            <label className="admin-pl-label">
              Подводка ведущего на вход (опционально)
              <textarea className="admin-comment-input admin-pl-textarea" rows={2} value={campaignHostIntroText} onChange={(e) => setCampaignHostIntroText(e.target.value)} />
            </label>
            <label className="admin-pl-label">
              Подводка ведущего на выход (опционально)
              <textarea className="admin-comment-input admin-pl-textarea" rows={2} value={campaignHostOutroText} onChange={(e) => setCampaignHostOutroText(e.target.value)} />
            </label>
            <div className="admin-pl-form-actions">
              <button type="submit" className="admin-btn admin-pl-submit" disabled={campaignsSaving}>
                {campaignsSaving ? 'Сохраняем...' : campaignEditingId ? 'Сохранить кампанию' : 'Создать кампанию'}
              </button>
              {campaignEditingId && (
                <button type="button" className="admin-btn admin-pl-cancel" onClick={resetCampaignForm}>Отмена</button>
              )}
            </div>
          </form>

          {campaignsLoading ? (
            <div className="loading">Загрузка кампаний...</div>
          ) : campaignsList.length === 0 ? (
            <div className="empty">Кампаний пока нет</div>
          ) : (
            <div className="admin-ann-grid">
              {campaignsList.map((c) => (
                <div key={c._id} className="admin-ann-card">
                  <div className="admin-ann-card-top">
                    <div className="admin-ann-card-title">{c.title}</div>
                    <div className="admin-ann-meta">
                      <span className="admin-ann-badge">{c.type}</span>
                      <span className="admin-ann-badge">{c.status}</span>
                    </div>
                  </div>
                  <div className="admin-ann-actions">
                    <button type="button" className="admin-btn admin-pl-edit" onClick={() => startEditCampaign(c)}>Редактировать</button>
                    <button type="button" className="admin-btn admin-pl-feature" onClick={() => setCampaignSelectedId(c._id)}>Заявки</button>
                    <button type="button" className="admin-btn reject" onClick={() => removeCampaign(c._id)} disabled={campaignsSaving}>Удалить</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {campaignSelectedId && (
            <div className="admin-playlist-form" style={{ maxWidth: '100%', marginTop: 18 }}>
              <h3 className="admin-playlist-form-title">Заявки кампании</h3>
              {campaignSubmissionsLoading ? (
                <div className="loading">Загрузка заявок...</div>
              ) : campaignSubmissions.length === 0 ? (
                <div className="empty">Пока нет заявок</div>
              ) : (
                <div className="reports-table-wrap">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Трек</th>
                        <th>Автор</th>
                        <th>Источник</th>
                        <th>Статус</th>
                        <th>Заметка</th>
                        <th>Действие</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaignSubmissions.map((s) => (
                        <tr key={s._id}>
                          <td>{s.trackId?.title || '-'}</td>
                          <td>{s.authorId?.username || s.trackId?.author?.username || '-'}</td>
                          <td>{s.source || '-'}</td>
                          <td>{s.status}</td>
                          <td>
                            <textarea
                              className="rep-admin-comment"
                              rows={2}
                              value={campaignSubmissionNotes[s._id] ?? (s.adminNote || '')}
                              onChange={(e) => setCampaignSubmissionNotes((prev) => ({ ...prev, [s._id]: e.target.value }))}
                            />
                          </td>
                          <td>
                            <div className="rep-actions">
                              {['pending', 'shortlisted', 'winner', 'editor_pick', 'rejected'].map((st) => (
                                <button key={st} type="button" className="admin-btn approve" onClick={() => updateSubmissionStatus(s._id, st)}>
                                  {st}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <style>{`
        .page-title { color: var(--neon-cyan); margin-bottom: 24px; }
        .admin-page {
          max-width: 1100px;
          margin: 0 auto;
          padding-left: 280px;
          padding-right: 24px;
        }
        .admin-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
        .admin-tabs button {
          padding: 10px 20px;
          border: 1px solid var(--neon-purple);
          background: transparent;
          color: var(--text);
          border-radius: 8px;
        }
        .admin-tabs button.active {
          background: rgba(211, 0, 197, 0.3);
          border-color: var(--neon-pink);
          color: var(--neon-pink);
        }
        .admin-hint { color: var(--text-dim); margin-bottom: 12px; font-size: 0.9rem; }
        .admin-pl-scope-row {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }
        .admin-pl-scope-label { color: var(--text-dim); font-size: 0.85rem; }
        .admin-pl-scope-select {
          padding: 8px 12px;
          border: 1px solid rgba(5, 217, 232, 0.4);
          border-radius: 8px;
          background: rgba(0,0,0,0.3);
          color: var(--text);
        }
        .admin-pl-hybrid-sync {
          flex: 0 1 auto;
          background: rgba(255, 200, 0, 0.14) !important;
          color: #ffd65a !important;
          border: 1px solid rgba(255, 200, 0, 0.45) !important;
          padding: 8px 12px !important;
        }
        .admin-pl-monthly-sync {
          flex: 0 1 auto;
          background: rgba(5, 217, 232, 0.14) !important;
          color: var(--neon-cyan) !important;
          border: 1px solid rgba(5, 217, 232, 0.45) !important;
          padding: 8px 12px !important;
        }
        .admin-pl-home-filter {
          padding: 8px 12px;
          border: 1px solid rgba(211, 0, 197, 0.35);
          border-radius: 8px;
          background: rgba(0,0,0,0.32);
          color: var(--text);
          min-width: 170px;
        }
        .admin-comment-input {
          width: 100%;
          max-width: 400px;
          padding: 10px 14px;
          margin-bottom: 20px;
          border: 1px solid rgba(5, 217, 232, 0.4);
          border-radius: 8px;
          background: rgba(0,0,0,0.3);
          color: var(--text);
        }
        .admin-user-search { margin-bottom: 12px; max-width: 420px; }
        .admin-user-count { font-size: 0.85rem; color: var(--text-dim); margin: 0 0 10px 0; }
        .admin-pending-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 20px;
        }
        .admin-card {
          background: var(--bg-card);
          border-radius: 12px;
          padding: 12px;
          border: 1px solid rgba(255, 42, 109, 0.3);
        }
        .admin-card-actions { display: flex; gap: 8px; margin-top: 12px; }
        .admin-btn {
          flex: 1;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 0.85rem;
          border: none;
        }
        .admin-btn.approve { background: rgba(0, 255, 100, 0.3); color: #00ff64; }
        .admin-btn.reject { background: rgba(255, 50, 50, 0.3); color: #ff3232; }
        .admin-playlists { margin-top: 8px; }
        .admin-playlist-form {
          max-width: 520px;
          padding: 18px;
          margin-bottom: 28px;
          border: 1px solid rgba(5, 217, 232, 0.25);
          border-radius: 12px;
          background: rgba(0,0,0,0.2);
        }
        .admin-playlist-form-title {
          margin: 0 0 14px;
          font-size: 1.05rem;
          color: var(--neon-cyan);
        }
        .admin-pl-label {
          display: block;
          margin-bottom: 12px;
          font-size: 0.85rem;
          color: var(--text-dim);
        }
        .admin-pl-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          font-size: 0.86rem;
          color: var(--text-dim);
        }
        .admin-pl-field { margin-bottom: 0 !important; max-width: none !important; width: 100%; }
        .admin-pl-textarea {
          width: 100%;
          max-width: none;
          min-height: 72px;
          padding: 10px 14px;
          margin-bottom: 0;
          border: 1px solid rgba(5, 217, 232, 0.4);
          border-radius: 8px;
          background: rgba(0,0,0,0.3);
          color: var(--text);
          font-family: inherit;
          resize: vertical;
        }
        .admin-pl-file {
          margin-top: 6px;
          font-size: 0.85rem;
          color: var(--text);
        }
        .admin-pl-form-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 8px;
        }
        .admin-pl-submit {
          background: rgba(5, 217, 232, 0.25) !important;
          color: var(--neon-cyan) !important;
          flex: 0 1 auto;
          padding: 10px 18px !important;
        }
        .admin-pl-cancel {
          background: transparent !important;
          border: 1px solid var(--text-dim) !important;
          color: var(--text-dim) !important;
        }
        .admin-pl-error {
          margin-bottom: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          background: rgba(255, 50, 50, 0.12);
          border: 1px solid rgba(255, 80, 80, 0.35);
          color: #ff6b6b;
          font-size: 0.9rem;
        }
        .admin-playlist-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }
        .admin-playlist-card {
          display: flex;
          gap: 12px;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(211, 0, 197, 0.25);
          background: rgba(0,0,0,0.18);
          align-items: flex-start;
        }
        .admin-playlist-card-cover {
          width: 88px;
          height: 88px;
          flex-shrink: 0;
          border-radius: 10px;
          background-size: cover;
          background-position: center;
          border: 1px solid rgba(5, 217, 232, 0.2);
        }
        .admin-playlist-card-body { flex: 1; min-width: 0; }
        .admin-playlist-card-title {
          font-weight: 600;
          color: var(--neon-cyan);
          margin-bottom: 6px;
          font-size: 0.95rem;
          line-height: 1.3;
        }
        .admin-playlist-card-meta {
          font-size: 0.8rem;
          color: var(--text-dim);
          margin-bottom: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
        }
        .admin-pl-badge {
          font-size: 0.75rem;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid rgba(255, 200, 0, 0.35);
        }
        .admin-pl-badge.pub { color: #69db7c; border-color: rgba(0, 255, 100, 0.35); }
        .admin-pl-badge.priv { color: #ffc800; }
        .admin-pl-badge.home { color: #ffd65a; border-color: rgba(255, 200, 0, 0.45); }
        .admin-playlist-card-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .admin-pl-link {
          font-size: 0.85rem;
          color: var(--neon-pink);
          text-decoration: underline;
        }
        .admin-pl-edit {
          background: rgba(120, 120, 255, 0.2) !important;
          color: #b9b9ff !important;
          flex: 0 1 auto;
        }
        .admin-pl-feature {
          background: rgba(255, 200, 0, 0.18) !important;
          color: #ffd65a !important;
          flex: 0 1 auto;
        }
        .admin-message {
          margin-bottom: 12px;
          color: var(--neon-cyan);
          font-size: 0.9rem;
        }
        .users-table-wrap {
          overflow-x: auto;
          border: 1px solid rgba(5, 217, 232, 0.2);
          border-radius: 10px;
        }
        .users-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 760px;
        }
        .users-table th,
        .users-table td {
          padding: 10px 12px;
          border-bottom: 1px solid rgba(5, 217, 232, 0.12);
          text-align: left;
          font-size: 0.9rem;
        }
        .users-table th {
          color: var(--neon-cyan);
          font-weight: 600;
        }
        .loading, .empty { padding: 24px; color: var(--text-dim); }

        .reports-table-wrap {
          overflow-x: auto;
          border: 1px solid rgba(5, 217, 232, 0.2);
          border-radius: 10px;
          margin-top: 12px;
        }
        .reports-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 980px;
        }
        .reports-table th,
        .reports-table td {
          padding: 10px 12px;
          border-bottom: 1px solid rgba(5, 217, 232, 0.12);
          text-align: left;
          font-size: 0.9rem;
          vertical-align: top;
        }
        .reports-table th {
          color: var(--neon-cyan);
          font-weight: 600;
        }
        .rep-text { max-width: 320px; }
        .rep-ai { margin-top: 6px; color: var(--text-dim); font-size: 0.8rem; }
        .rep-admin-comment {
          width: 260px;
          background: rgba(0,0,0,0.25);
          border: 1px solid rgba(5, 217, 232, 0.35);
          border-radius: 10px;
          padding: 8px 10px;
          color: var(--text);
          resize: vertical;
        }
        .rep-actions { display: flex; flex-direction: column; gap: 8px; }

        .admin-announcements { margin-top: 8px; }
        .admin-ann-form { max-width: 620px; margin-bottom: 22px; }
        .admin-ann-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }
        .admin-ann-card {
          border: 1px solid rgba(5, 217, 232, 0.22);
          background: rgba(0,0,0,0.18);
          border-radius: 12px;
          padding: 12px;
        }
        .admin-ann-card-top { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
        .admin-ann-card-title { color: var(--neon-cyan); font-weight: 650; font-size: 1rem; }
        .admin-ann-meta { display: flex; flex-wrap: wrap; gap: 8px; }
        .admin-ann-badge {
          font-size: 0.78rem;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid rgba(255, 200, 0, 0.3);
          color: var(--text-dim);
        }
        .admin-ann-badge.home {
          border-color: rgba(255, 200, 0, 0.45);
          color: #ffd65a;
        }
        .admin-ann-card-message {
          color: var(--text-dim);
          font-size: 0.9rem;
          margin-bottom: 10px;
          white-space: pre-wrap;
        }
        .admin-ann-actions { display: flex; gap: 8px; }
        .admin-ann-actions .admin-btn { flex: 1; }

        @media (max-width: 900px) {
          .admin-page { padding-left: 0; padding-right: 0; }
        }
      `}</style>
    </motion.div>
  );
}
