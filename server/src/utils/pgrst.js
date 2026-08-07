// Safe construction of PostgREST filter strings.
//
// supabase-js `.or()` takes a raw string that becomes `or=(<string>)`. The
// string is a comma-separated condition list, so any user value interpolated
// into it can add conditions of its own:
//
//   warehouse_id = "<uuid>,id.not.is.null"
//   → or=(source_warehouse_id.eq.<uuid>,id.not.is.null,destination_…)
//
// `id.not.is.null` matches every row, and the scope filter is gone. The service
// role bypasses RLS, so the filter string is the only thing limiting what comes
// back. Build it from parts here instead of interpolating.
 
const AppError = require('./AppError');
 
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 
// Characters that mean something inside a PostgREST filter list. A value
// carrying any of them cannot be placed in a condition unquoted.
const UNSAFE_RE = /[,.()"\\]/;
 
/**
 * Assert a value is a UUID, for parameters used in `.eq.` conditions.
 * Rejecting early gives a 400 with a sentence rather than a 500 from PostgREST.
 */
function requireUuid(value, field = 'id') {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new AppError(`"${field}" must be a valid id.`, 400);
  }
  return value;
}
 
function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}
 
/**
 * Escape a user search term for use inside an `ilike` pattern.
 *
 * Two separate problems are handled:
 *   - PostgREST syntax: a comma or a bracket would restructure the filter list.
 *   - LIKE syntax: `%` and `_` are wildcards, so searching for "50%" should not
 *     match everything.
 *
 * PostgREST allows a condition value to be double-quoted, which neutralises the
 * separators; the quote itself is then the only character needing an escape.
 */
function likeTerm(term) {
  const s = String(term ?? '');
  const escaped = s
    .replace(/\\/g, '\\\\')   // backslash first, or later escapes double up
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/"/g, '\\"');
  return `"%${escaped}%"`;
}
 
/**
 * Quote a value for an exact comparison (`eq`, `neq`).
 *
 * Unlike likeTerm() this adds no wildcards — `eq` is not a pattern match, and
 * wrapping the value in `%` would compare against a literal percent sign.
 */
function quoteValue(value) {
  const escaped = String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
  return `"${escaped}"`;
}
 
/**
 * Build an `or=(…)` clause from structured conditions.
 *
 * @param {Array<[string, string, string]>} conditions  [column, operator, value]
 *        `value` must already be safe: a UUID, or the output of likeTerm().
 * @returns {string} the clause to hand to `.or()`
 */
function orFilter(conditions) {
  return conditions
    .map(([column, op, value]) => {
      if (UNSAFE_RE.test(column) || UNSAFE_RE.test(op)) {
        throw new AppError('Invalid filter.', 400);
      }
      // A quoted value has already been made safe by likeTerm(). Anything else
      // must be free of separators on its own.
      const quoted = typeof value === 'string' && value.startsWith('"') && value.endsWith('"');
      if (!quoted && UNSAFE_RE.test(String(value))) {
        throw new AppError('Invalid filter value.', 400);
      }
      return `${column}.${op}.${value}`;
    })
    .join(',');
}
 
/**
 * The common case: match one search term against several text columns.
 */
function searchAcross(columns, term) {
  const safe = likeTerm(term);
  return orFilter(columns.map((c) => [c, 'ilike', safe]));
}
 
module.exports = { requireUuid, isUuid, likeTerm, quoteValue, orFilter, searchAcross, UUID_RE };