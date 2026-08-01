#!/usr/bin/env node
/*
 * Connection diagnostic.  Run from the repo root:
 *
 *     node server/diagnose.js
 *
 * Tests each hop between the browser and Postgres and reports the first one
 * that breaks.  Prints only key prefixes, never whole keys.
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
 
const ok = (m) => console.log(`  \x1b[32mPASS\x1b[0m  ${m}`);
const bad = (m) => console.log(`  \x1b[31mFAIL\x1b[0m  ${m}`);
const warn = (m) => console.log(`  \x1b[33mWARN\x1b[0m  ${m}`);
const head = (m) => console.log(`\n\x1b[1m${m}\x1b[0m`);
 
const mask = (k) => (!k ? '(not set)' : k.slice(0, 14) + '…' + k.slice(-4) + `  [${k.length} chars]`);
 
function keyRole(key) {
  if (!key) return 'missing';
  if (key.startsWith('sb_secret_')) return 'service_role';
  if (key.startsWith('sb_publishable_')) return 'anon';
  const p = key.split('.');
  if (p.length !== 3) return 'unknown';
  try {
    return JSON.parse(Buffer.from(p[1], 'base64').toString()).role || 'unknown';
  } catch {
    return 'unknown';
  }
}
 
(async () => {
  let fatal = false;
 
  head('1. server/.env is loaded');
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url) { bad('SUPABASE_URL is not set'); fatal = true; } else ok(`SUPABASE_URL = ${url}`);
  if (!secret) { bad('SUPABASE_SERVICE_ROLE_KEY is not set'); fatal = true; }
  else {
    const role = keyRole(secret);
    console.log(`        key = ${mask(secret)}`);
    if (role === 'service_role') ok(`key role = ${role}`);
    else { bad(`key role = ${role} — must be service_role (sb_secret_… or a service_role JWT)`); fatal = true; }
  }
  if (/\s$/.test(url || '') || /\s$/.test(secret || '')) {
    warn('a value has trailing whitespace — quote it or remove the trailing spaces');
  }
  if (fatal) { console.log('\nStopping: fix the above first.\n'); process.exit(1); }
 
  head('2. DNS + TCP to Supabase');
  const host = new URL(url).hostname;
  try {
    const { lookup } = require('dns').promises;
    const addrs = await lookup(host, { all: true });
    ok(`DNS ${host} -> ${addrs.map((a) => a.address).join(', ')}`);
  } catch (e) {
    bad(`DNS lookup for ${host} failed — ${e.code || e.message}`);
    console.log('        Your machine cannot resolve the Supabase host. Check your');
    console.log('        internet connection, VPN, or DNS settings.');
  }
 
  head('3. Supabase REST reachable, and the key bypasses RLS');
  // Hitting PostgREST directly removes supabase-js from the picture.
  for (const table of ['products', 'customers', 'orders', 'profiles']) {
    try {
      const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
        headers: {
          apikey: secret,
          Authorization: `Bearer ${secret}`,
          Prefer: 'count=exact',
          Range: '0-0',
        },
      });
      const range = res.headers.get('content-range') || '';
      const total = range.split('/')[1];
      if (res.status === 200 || res.status === 206) {
        if (total === '0') warn(`${table.padEnd(10)} reachable but has 0 rows`);
        else ok(`${table.padEnd(10)} ${total} rows`);
      } else {
        const body = await res.text();
        bad(`${table.padEnd(10)} HTTP ${res.status} — ${body.slice(0, 160)}`);
      }
    } catch (e) {
      // Node reports every network failure as "fetch failed"; err.cause holds
      // the real reason (ENOTFOUND, ECONNREFUSED, certificate errors, ...).
      const c = e.cause || {};
      bad(`${table.padEnd(10)} ${e.message}${c.code ? ` (${c.code})` : ''}${c.message ? ` — ${c.message}` : ''}`);
    }
  }
 
  head('4. Local API server (must be running: npm --prefix server run dev)');
  const port = process.env.PORT || 5500;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    ok(`http://127.0.0.1:${port}/api/health → HTTP ${res.status} ${await res.text()}`);
  } catch (e) {
    const c = e.cause || {};
    bad(`http://127.0.0.1:${port}/api/health — ${e.message}${c.code ? ` (${c.code})` : ''}`);
    console.log('        ECONNREFUSED here means the API is not running. Start it with');
    console.log('        `npm --prefix server run dev` and read its FIRST lines — if it');
    console.log('        crashed, the reason is printed there.');
    console.log('        While it is down the Vite proxy has nothing to forward /api to,');
    console.log('        so the panel shows zeroes. Login keeps working because it talks');
    console.log('        to Supabase directly.');
  }
 
  head('5. An authenticated endpoint through the API');
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/admin/products`);
    if (res.status === 401) ok('/api/admin/products → 401 without a token (correct)');
    else warn(`/api/admin/products → HTTP ${res.status} (expected 401)`);
  } catch {
    bad('could not reach the API — see step 4');
  }
 
  head('6. AI provider');
  const provider = process.env.AI_PROVIDER || 'claude';
  const aiKey = provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.CLAUDE_API_KEY;
  if (!aiKey) bad(`AI_PROVIDER=${provider} but ${provider === 'openai' ? 'OPENAI_API_KEY' : 'CLAUDE_API_KEY'} is empty — War Room will fail`);
  else ok(`AI_PROVIDER=${provider}, key present`);
 
  console.log('\nDone.\n');
})();