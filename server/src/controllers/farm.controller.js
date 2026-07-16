// const { createClient } = require('@supabase/supabase-js');
const supabase = require('../config/supabaseAdmin');
const AppError = require('../utils/AppError');

// const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
// ── AI provider (switchable: Claude / OpenAI) ────────────────────────────
// Which provider is used is stored in the settings table (key: ai_provider,
// value: 'claude' | 'openai') and editable from Admin → Settings.
// API keys stay server-side in .env (CLAUDE_API_KEY / OPENAI_API_KEY).

async function getSetting(key) {
  const { data } = await supabase.from('settings').select('value').eq('key', key).single();
  return data?.value || null;
}
 
// Distinguish "missing" from "placeholder" so the error tells the user
// exactly what to fix. NOTE: dotenv reads .env ONCE at server start —
// changing .env requires a server restart to take effect.
function checkApiKey(name) {
  const val = (process.env[name] || '').trim();
  if (!val) {
    throw new AppError(`${name} is missing from server/.env (or the server was not restarted after adding it). Add the key and restart the server.`, 503);
  }
  if (/dummy|your[-_]|xxxx|change/i.test(val)) {
    throw new AppError(`${name} in server/.env still contains a placeholder value ("${val.slice(0, 12)}…"). Replace it with a real API key and restart the server.`, 503);
  }
  return val;
}
 
async function callClaude(system, user, model) {
  const apiKey = checkApiKey('CLAUDE_API_KEY');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 1000, system, messages: [{ role: 'user', content: user }] }),
  });
  const data = await res.json();
  if (!data.content) throw new AppError(data.error?.message || 'Claude API error', 502);
  return data.content.filter(b => b.type === 'text').map(b => b.text).join('');
}

async function callOpenAI(system, user, model) {
  const apiKey = checkApiKey('OPENAI_API_KEY');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: 1000,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  });
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new AppError(data.error?.message || 'OpenAI API error', 502);
  return text;
}
 
async function callAI(system, user) {
  const provider = (await getSetting('ai_provider')) || process.env.AI_PROVIDER || 'claude';
  if (provider === 'openai') {
    const model = (await getSetting('ai_model_openai')) || 'gpt-4o-mini';
    return callOpenAI(system, user, model);
  }
  const model = (await getSetting('ai_model_claude')) || 'claude-sonnet-4-20250514';
  return callClaude(system, user, model);
}
 
// ── Crop setups ──────────────────────────────────────────────────────────
 
exports.getCrops = async (req, res, next) => {
  const { data, error } = await supabase.from('crop_setups').select('*');
  if (error) return next(new AppError(error.message, 500));
  res.json({ success: true, data });
};

exports.updateCrop = async (req, res, next) => {
  const { cropId } = req.params;
  // Only real columns — the form may send extra display fields
  const { planting_date, area_acres, pop_json } = req.body;
  const patch = { crop_id: cropId, updated_at: new Date().toISOString() };
  if (planting_date !== undefined) patch.planting_date = planting_date || null;
  if (area_acres !== undefined) patch.area_acres = area_acres === null || area_acres === '' ? null : parseFloat(area_acres);
  if (pop_json !== undefined) patch.pop_json = pop_json;

  const { data, error } = await supabase
    .from('crop_setups')
    .upsert(patch, { onConflict: 'crop_id' })
    .select();
  if (error) {
    // Without the crop_id UNIQUE constraint the upsert cannot work — point
    // at the migration instead of failing cryptically.
    if (/no unique|exclusion constraint/i.test(error.message)) {
      return next(new AppError('Database migration missing: run database/2026-07-11_ops_upgrade.sql in Supabase (adds the crop_setups.crop_id unique constraint).', 500));
    }
    return next(new AppError(error.message, 500));
  }
  res.json({ success: true, data });
};

// DELETE /admin/farm/crops/:cropId — remove a crop's setup entry
// (planting date, area, generated POP). Observations are kept.
exports.deleteCrop = async (req, res, next) => {
  const { error } = await supabase.from('crop_setups').delete().eq('crop_id', req.params.cropId);
  if (error) return next(new AppError(error.message, 500));
  res.json({ success: true, message: 'Crop entry deleted.' });
};

exports.generatePOP = async (req, res, next) => {
  try {
    const { cropId } = req.params;
    const { data: crop } = await supabase.from('crop_setups').select('*').eq('crop_id', cropId).single();
    if (!crop || !crop.planting_date) return next(new AppError('Planting date not set.', 400));

    const weeksIn = crop.planting_date
      ? Math.max(0, Math.floor((Date.now() - new Date(crop.planting_date)) / 604800000))
      : 0;

const systemPrompt = `You are an expert agronomist for Indian medicinal herb farming.
Give practical, week-specific field tasks for the crop at its current growth stage.
Be concise and actionable. Format as a numbered list.`;

const userPrompt = `Crop: ${cropId}
Weeks since planting: ${weeksIn}
Generate specific field tasks for this week. Include: irrigation schedule, pest scouting, fertilisation if due, and any stage-specific actions.`;

    const text = await callAI(systemPrompt, userPrompt);
    if (!text) return next(new AppError('AI generation failed.', 500));

    const pop = { week: weeksIn, text, date: new Date().toISOString() };

    const { error } = await supabase.from('crop_setups').update({ pop_json: pop }).eq('crop_id', cropId);
    if (error) return next(new AppError(error.message, 500));
    res.json({ success: true, data: pop });
  } catch (err) { next(err); }
};

// ── Observations ─────────────────────────────────────────────────────────
 
exports.getObservations = async (req, res, next) => {
  const { cropId } = req.params;
  const { data, error } = await supabase.from('crop_observations').select('*').eq('crop_id', cropId).order('date', { ascending: false });
  if (error) return next(new AppError(error.message, 500));
  res.json({ success: true, data });
};

exports.addObservation = async (req, res, next) => {
  const { cropId } = req.params;
  const { data, error } = await supabase
    .from('crop_observations')
    .insert({ crop_id: cropId, ...req.body, logged_by: req.user.id })
    .select()
    .single();
  if (error) return next(new AppError(error.message, 500));
  res.status(201).json({ success: true, data });
};

// ── Expenses ─────────────────────────────────────────────────────────────
 
exports.getExpenses = async (req, res, next) => {
  const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
  if (error) return next(new AppError(error.message, 500));
  res.json({ success: true, data });
};

exports.addExpense = async (req, res, next) => {
  // Map form-only fields to real columns: "by" -> logged_by_name, "note" -> description
  const { by, note, ...rest } = req.body;
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      ...rest,
      description: rest.description || note || null,
      logged_by_name: by || rest.logged_by_name || null,
      logged_by: req.user.id,
    })
    .select()
    .single();
  if (error) return next(new AppError(error.message, 500));
  res.status(201).json({ success: true, data });
};

exports.deleteExpense = async (req, res, next) => {
  const { error } = await supabase.from('expenses').delete().eq('id', req.params.id);
  if (error) return next(new AppError(error.message, 500));
  res.json({ success: true });
};

// ── Farmers ──────────────────────────────────────────────────────────────
exports.getFarmers = async (req, res, next) => {
  const { data, error } = await supabase
    .from('farmers')
    .select('*, farmer_visits(*, visitor:profiles(name)), enroller:profiles(name)')
    .order('created_at', { ascending: false });
  if (error) return next(new AppError(error.message, 500));
  res.json({ success: true, data });
};

exports.addFarmer = async (req, res, next) => {
  // "by" is a form-only field (who enrolled) — not a column; the actual user id goes to enrolled_by
  const { by, ...rest } = req.body;
  const { data, error } = await supabase
    .from('farmers')
    .insert({ ...rest, area_decimal: rest.area_decimal ? parseFloat(rest.area_decimal) : null, enrolled_by: req.user.id })
    .select()
    .single();
  if (error) return next(new AppError(error.message, 500));
  res.status(201).json({ success: true, data });
};

exports.deleteFarmer = async (req, res, next) => {
  const { error } = await supabase.from('farmers').delete().eq('id', req.params.id);
  if (error) return next(new AppError(error.message, 500));
  res.json({ success: true });
};

exports.addVisit = async (req, res, next) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('farmer_visits')
    .insert({ farmer_id: id, ...req.body, visited_by: req.user.id })
    .select()
    .single();
  if (error) return next(new AppError(error.message, 500));
  res.status(201).json({ success: true, data });
};

// ── Cash ─────────────────────────────────────────────────────────────────

exports.getCash = async (req, res, next) => {
  const { data, error } = await supabase.from('cash_balance').select('*').order('updated_at', { ascending: false }).limit(1);
  if (error) return next(new AppError(error.message, 500));
  res.json({ success: true, data: data[0] || null });
};

exports.updateCash = async (req, res, next) => {
  const { amount } = req.body;
  if (amount == null || isNaN(parseFloat(amount))) return next(new AppError('A numeric "amount" is required.', 400));
  const { data, error } = await supabase
    .from('cash_balance')
    .insert({ amount: parseFloat(amount), updated_by: req.user.id })
    .select()
    .single();
  if (error) return next(new AppError(error.message, 500));
  res.json({ success: true, data });
};

// GET /admin/farm/cash/history — cash_balance is append-only, so every
// "Update" is already stored with user + timestamp. This exposes the log.
exports.getCashHistory = async (req, res, next) => {
  const { data, error } = await supabase
    .from('cash_balance')
    .select('*, user:profiles(name)')
    .order('updated_at', { ascending: false })
    .limit(20);
  if (error) return next(new AppError(error.message, 500));
  // Attach the previous value to each entry so the UI can show old → new
  const rows = (data || []).map((row, i, arr) => ({
    ...row,
    previous_amount: i < arr.length - 1 ? arr[i + 1].amount : null,
  }));
  res.json({ success: true, data: rows });
};

// ── Finance settings (EMI etc. — values managed in Admin → Settings) ─────
 
exports.getFinanceSettings = async (req, res, next) => {
  const keys = ['emi_monthly_amount', 'emi_start_date', 'emi_label'];
  const { data, error } = await supabase.from('settings').select('key,value').in('key', keys);
  if (error) return next(new AppError(error.message, 500));
  const out = {};
  (data || []).forEach((r) => { out[r.key] = r.value; });
  res.json({ success: true, data: out });
};

// ── Crop options + farmer coverage targets ───────────────────────────────
 
// Active products double as the farm crop list (no more hardcoded crops).
exports.getCropOptions = async (req, res, next) => {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name', { ascending: true });
  if (error) return next(new AppError(error.message, 500));
  res.json({ success: true, data });
};
 
// Targets stored in settings.farm_targets as JSON { "<crop-slug>": number }
exports.getTargets = async (req, res, next) => {
  const raw = await getSetting('farm_targets');
  let targets = {};
  try { targets = raw ? JSON.parse(raw) : {}; } catch { targets = {}; }
  res.json({ success: true, data: targets });
};
 
exports.updateTargets = async (req, res, next) => {
  const { targets } = req.body;
  if (!targets || typeof targets !== 'object' || Array.isArray(targets)) {
    return next(new AppError('Request body must contain a "targets" object.', 400));
  }
  const clean = {};
  for (const [k, v] of Object.entries(targets)) {
    const n = parseInt(v, 10);
    if (!isNaN(n) && n >= 0) clean[k] = n;
  }
  const { error } = await supabase
    .from('settings')
    .upsert({ key: 'farm_targets', value: JSON.stringify(clean), updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) return next(new AppError(error.message, 500));
  res.json({ success: true, data: clean });
};
 
// ── Finance summary (synchronised with Orders) ──────────────────────────
// Revenue = revenue entries logged in Farm Ops + product sales from orders
// (status confirmed/dispatched/delivered) in the same month.
exports.getFinanceSummary = async (req, res, next) => {
  try {
    const month = /^\d{4}-\d{2}$/.test(req.query.month || '')
      ? req.query.month
      : new Date().toISOString().slice(0, 7);
    const start = `${month}-01`;
    const [y, m] = month.split('-').map(Number);
    const end = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
 
    const [{ data: exp, error: e1 }, { data: orders, error: e2 }] = await Promise.all([
      supabase.from('expenses').select('type, amount').gte('date', start).lt('date', end),
      supabase.from('orders').select('total_amount, status')
        .gte('order_date', start).lt('order_date', end)
        .in('status', ['confirmed', 'dispatched', 'delivered']),
    ]);
    if (e1 || e2) return next(new AppError((e1 || e2).message, 500));
 
    const logged_revenue = (exp || []).filter(x => x.type === 'revenue').reduce((s, x) => s + parseFloat(x.amount || 0), 0);
    const expenses = (exp || []).filter(x => x.type === 'expense').reduce((s, x) => s + parseFloat(x.amount || 0), 0);
    const product_sales = (orders || []).reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);
 
    res.json({
      success: true,
      data: {
        month,
        logged_revenue,
        product_sales,
        orders_count: (orders || []).length,
        total_revenue: logged_revenue + product_sales,
        expenses,
      },
    });
  } catch (err) { next(err); }
};

// ── War Room ─────────────────────────────────────────────────────────────

exports.generateBrief = async (req, res, next) => {
  try {
    const { week_ref } = req.body;
    const [{ data: crops }, { data: expenses }, { data: farmers }, { data: cash }, { data: salesOrders }] = await Promise.all([
      supabase.from('crop_setups').select('*'),
      supabase.from('expenses').select('*'),
      supabase.from('farmers').select('*, farmer_visits(*)'),
      supabase.from('cash_balance').select('*').order('updated_at', { ascending: false }).limit(1),
      supabase.from('orders').select('total_amount').in('status', ['confirmed', 'dispatched', 'delivered']),
    ]);

    const cashAmount = cash?.[0]?.amount || 0;
    const totalExpenses = expenses?.reduce((s, e) => e.type === 'expense' ? s + parseFloat(e.amount) : s, 0) || 0;
    const loggedRevenue = expenses?.reduce((s, e) => e.type === 'revenue' ? s + parseFloat(e.amount) : s, 0) || 0;
    const productSales = salesOrders?.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0) || 0;
    const totalRevenue = loggedRevenue + productSales;
 
    const systemPrompt = `You are a farm operations advisor. Analyse the data and produce a Monday War Room brief as valid JSON only — no markdown, no explanation.
Return exactly this structure:
{
  "overallStatus": "GREEN" | "AMBER" | "RED",
  "headline": "one sentence summary",
  "crops": [{"name": string, "week": number, "status": "GREEN"|"AMBER"|"RED", "note": string}],
  "actions": [{"priority": number, "action": string, "owner": string, "by": string}],
  "risks": [{"level": "HIGH"|"MEDIUM", "risk": string, "fix": string}],
  "founderDecision": string | null
}`;

    const userPrompt = `Week reference: ${week_ref}
Crops: ${JSON.stringify(crops?.map(c => ({ id: c.crop_id, planting_date: c.planting_date })))}
Farmers enrolled: ${farmers?.length || 0}
Cash on hand: ₹${cashAmount}
Monthly expenses: ₹${totalExpenses}
Revenue (logged ₹${loggedRevenue} + product sales ₹${productSales}): ₹${totalRevenue}
Generate the War Room brief.`;

    const briefText = await callAI(systemPrompt, userPrompt);
    let briefJson;
    try {
      briefJson = JSON.parse(briefText.replace(/```json|```/g, ''));
    } catch { return next(new AppError('Failed to parse brief.', 500)); }
 
    const { data, error } = await supabase
      .from('war_room_briefs')
      .insert({ week_ref, brief_json: briefJson, generated_by: req.user.id })
      .select()
      .single();
    if (error) return next(new AppError(error.message, 500));
 
    res.json({ success: true, data: { brief_json: briefJson, id: data.id } });
  } catch (err) { next(err); }
};

exports.getBriefs = async (req, res, next) => {
  const { data, error } = await supabase.from('war_room_briefs').select('*').order('created_at', { ascending: false });
  if (error) return next(new AppError(error.message, 500));
  res.json({ success: true, data });
};

// GET /api/admin/farm/analytics — expense by category + farmers by crop
exports.getFarmAnalytics = async (req, res, next) => {
  const [{ data: expenses, error: e1 }, { data: farmers, error: e2 }] = await Promise.all([
    supabase.from('expenses').select('type, category, amount'),
    supabase.from('farmers').select('crop, area_decimal'),
  ]);
  if (e1 || e2) return next(new AppError((e1 || e2).message, 500));

  const expenseByCategory = {};
  (expenses || []).filter(e => e.type === 'expense').forEach(e => {
    const k = e.category || 'other';
    expenseByCategory[k] = (expenseByCategory[k] || 0) + parseFloat(e.amount || 0);
  });

  const farmersByCrop = {};
  (farmers || []).forEach(f => {
    const k = f.crop || 'unknown';
    if (!farmersByCrop[k]) farmersByCrop[k] = { count: 0, area_decimal: 0 };
    farmersByCrop[k].count += 1;
    farmersByCrop[k].area_decimal += parseFloat(f.area_decimal || 0);
  });

  res.json({
    success: true,
    data: {
      expense_by_category: Object.entries(expenseByCategory)
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total),
      farmers_by_crop: Object.entries(farmersByCrop)
        .map(([crop, v]) => ({ crop, ...v })),
      total_farmers: (farmers || []).length,
    },
  });
};