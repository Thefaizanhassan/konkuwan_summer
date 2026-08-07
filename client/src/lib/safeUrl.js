// Guard for URLs that came out of the database and are about to become an
// `href`.
//
// React escapes text, but it does not police link targets: `javascript:…` in an
// href runs on click. Supabase keeps the session token in localStorage, so any
// script execution on this origin is a full account takeover — an order_manager
// could save a `javascript:` URL as a customer's LinkedIn link and take over the
// next super_admin who clicks it.
 
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:'];
 
/**
 * @param {string} value
 * @returns {string|null} the URL if it is safe to use as a link target,
 *                        otherwise null so the caller can render plain text.
 */
export function safeUrl(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
 
  // A protocol-relative URL ("//evil.com") inherits the current scheme and is
  // a real destination, so allow it. A bare path is same-origin and fine too.
  if (trimmed.startsWith('//') || trimmed.startsWith('/')) return trimmed;
 
  try {
    // A base is required so relative inputs parse; the protocol check below is
    // what actually decides, and a relative input resolves to the page's own
    // protocol rather than picking up a dangerous one.
    const url = new URL(trimmed, window.location.origin);
    return ALLOWED_PROTOCOLS.includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
 
export default safeUrl;