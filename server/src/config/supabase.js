// Kept as a separate entry point for user.admin.controller.js, but it must
// resolve the SAME key as config/supabaseAdmin.js. These two used opposite
// precedence, so if SUPABASE_SERVICE_KEY and SUPABASE_SERVICE_ROLE_KEY held
// different values, half the app ran as one Postgres role and half as another.
// Load configuration first: config/index.js calls dotenv.config(), and this
// module reads process.env at load time. Requiring it here makes the module
// self-sufficient no matter which entry point pulls it in first.
require('./index');
const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL) {
  throw new Error('Missing SUPABASE_URL environment variable');
}

const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!serviceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

const supabase = createClient(process.env.SUPABASE_URL, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

module.exports = supabase;