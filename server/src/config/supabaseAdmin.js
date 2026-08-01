// Single service-role client for all controllers (bypasses RLS; server is trusted).
// Load configuration first: config/index.js calls dotenv.config(), and this
// module reads process.env at load time. Requiring it here makes the module
// self-sufficient no matter which entry point pulls it in first.
require('./index');
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!url || !serviceKey) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');

// Guard against the single most confusing misconfiguration: putting the
// anon/publishable key here. Auth still succeeds (so login works), but every
// query runs as the `anon` Postgres role and RLS filters the rows away — so
// the UI shows empty tables and zeroes with no error anywhere.
function keyRole(key) {
  if (key.startsWith('sb_secret_')) return 'service_role';
  if (key.startsWith('sb_publishable_')) return 'anon';
  const parts = key.split('.');
  if (parts.length !== 3) return 'unknown';
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64').toString()).role || 'unknown';
  } catch {
    return 'unknown';
  }
}
 
const role = keyRole(serviceKey);
if (role !== 'service_role' && role !== 'unknown') {
  // Loud, because every symptom of this is silent.
  console.error(
    `[konkuwan-api] FATAL: SUPABASE_SERVICE_ROLE_KEY holds a "${role}" key, not a ` +
      'service_role key. Reads will return empty results because Row Level ' +
      'Security applies. Copy the "service_role" / "secret" key from ' +
      'Supabase → Project Settings → API into server/.env.'
  );
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

module.exports = supabase;