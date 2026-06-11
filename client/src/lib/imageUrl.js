// Resolves product image URLs. The API stores relative paths like
// "/uploads/products/x.jpg" which must be prefixed with the server origin
// (the API base minus the trailing /api) so <img> tags load correctly.
const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')
  .replace(/\/api\/?$/, '');

export function resolveImageUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}