/**
 * Обложки с API (Cloudinary и т.д.): безопасный URL для CSS background-image + cache-bust.
 * Поднимает http→https для Cloudinary (mixed content на https-сайтах).
 */
export function normalizeCoverUrl(url) {
  if (!url || typeof url !== 'string') return '';
  let u = url.trim();
  if (!u) return '';
  if (u.startsWith('http://res.cloudinary.com') || u.startsWith('http://api.cloudinary.com')) {
    u = `https://${u.slice(7)}`;
  }
  return u;
}

export function coverImageBackgroundStyle(coverImage, updatedAt) {
  const u = normalizeCoverUrl(coverImage);
  if (!u) {
    return { backgroundImage: 'linear-gradient(135deg, var(--neon-purple), var(--neon-pink))' };
  }
  const bust = updatedAt ? new Date(updatedAt).getTime() : '';
  const sep = u.includes('?') ? '&' : '?';
  const href = bust ? `${u}${sep}cb=${encodeURIComponent(String(bust))}` : u;
  const safe = href.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return { backgroundImage: `url("${safe}")` };
}
