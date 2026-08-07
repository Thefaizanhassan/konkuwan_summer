// One place that decides how many rows a list endpoint may return.
//
// `parseInt(req.query.limit) || 20` has no ceiling: `?limit=10000000` asks
// Supabase for the whole table and streams it into a Worker with a 128 MB
// memory cap. `?page=-5` produces a negative range, which PostgREST rejects
// with a 500. Both are one query string away from any authenticated user.
 
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
 
/**
 * @param {object} query          req.query
 * @param {object} [opts]
 * @param {number} [opts.defaultLimit]
 * @param {number} [opts.maxLimit] Raise only where a larger page is genuinely
 *                                 needed, e.g. an export.
 * @returns {{page:number, limit:number, from:number, to:number}}
 */
function parsePagination(query = {}, opts = {}) {
  const defaultLimit = opts.defaultLimit || DEFAULT_LIMIT;
  const maxLimit = opts.maxLimit || MAX_LIMIT;
 
  const rawPage = parseInt(query.page, 10);
  const rawLimit = parseInt(query.limit, 10);
 
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(rawLimit, maxLimit)
    : defaultLimit;
 
  const from = (page - 1) * limit;
  return { page, limit, from, to: from + limit - 1 };
}
 
module.exports = { parsePagination, DEFAULT_LIMIT, MAX_LIMIT };