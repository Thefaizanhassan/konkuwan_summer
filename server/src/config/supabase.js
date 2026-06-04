const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL) {
  throw new Error('Missing SUPABASE_URL environment variable');
}

const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) {
  throw new Error('Missing SUPABASE_SERVICE_KEY environment variable');
}

const supabase = createClient(process.env.SUPABASE_URL, serviceKey);

module.exports = supabase;