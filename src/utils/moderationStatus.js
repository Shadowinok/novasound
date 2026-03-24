export function getTrackStatusMeta(track) {
  const status = String(track?.status || '').toLowerCase();
  const hasPendingCover = track?.coverChangeStatus === 'pending' && !!track?.coverImagePending;

  if (status === 'approved') {
    return {
      label: 'Опубликован',
      hint: hasPendingCover
        ? 'Трек опубликован. Новая обложка на модерации.'
        : 'Трек опубликован в каталоге.'
    };
  }

  if (status === 'pending') {
    return {
      label: 'На модерации',
      hint: track?.moderationComment || 'Ожидает проверки модератором.'
    };
  }

  if (status === 'rejected') {
    return {
      label: 'Отклонён',
      hint: track?.moderationComment || 'Трек отклонён модерацией.'
    };
  }

  return { label: status || 'Статус неизвестен', hint: '' };
}

