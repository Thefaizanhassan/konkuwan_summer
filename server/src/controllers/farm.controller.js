const { createClient } = require('@supabase/supabase-js');
const AppError = require('../utils/AppError');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Helper to call Claude
async function callClaude(system, user) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.CLAUDE_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, system, messages: [{ role: 'user', content: user }] }),
  });
  const data = await res.json();
  if (!data.content) throw new Error('Claude API error');
  return data.content.filter(b => b.type === 'text').map(b => b.text).join('');
}

// Crop setups
exports.getCrops = async (req, res, next) => {
  const { data, error } = await supabase.from('crop_setups').select('*');
  if (error) return next(new AppError(error.message, 500));
  res.json({ success: true, data });
};

exports.updateCrop = async (req, res, next) => {
  const { cropId } = req.params;
  const { data, error } = await supabase.from('crop_setups').upsert({ crop_id: cropId, ...req.body }, { onConflict: 'crop_id' });
  if (error) return next(new AppError(error.message, 500));
  res.json({ success: true, data });
};

exports.generatePOP = async (req, res, next) => {
  const { cropId } = req.params;
  const { data: crop } = await supabase.from('crop_setups').select('*').eq('crop_id', cropId).single();
  if (!crop || !crop.planting_date) return next(new AppError('Planting date not set.', 400));

  // Build prompt similar to original
  const prompt = /* assemble system and user prompts using crop data */;
  const text = await callClaude(prompt.system, prompt.user);
  if (!text) return next(new AppError('Claude generation failed.', 500));

  const pop = { week: /* calculated week */, text, date: new Date().toISOString() };
  const { error } = await supabase.from('crop_setups').update({ pop_json: pop }).eq('crop_id', cropId);
  if (error) return next(new AppError(error.message, 500));
  res.json({ success: true, data: pop });
};

// Observations
exports.getObservations = async (req, res, next) => {
  const { cropId } = req.params;
  const { data, error } = await supabase.from('crop_observations').select('*').eq('crop_id', cropId).order('date', { ascending: false });
  if (error) return next(new AppError(error.message, 500));
  res.json({ success: true, data });
};

exports.addObservation = async (req, res, next) => {
  const { cropId } = req.params;
  const { data, error } = await supabase.from('crop_observations').insert({ crop_id: cropId, ...req.body, logged_by: req.user.id }).single();
  if (error) return next(new AppError(error.message, 500));
  res.status(201).json({ success: true, data });
};

// Expenses
exports.getExpenses = async (req, res, next) => {
  const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
  if (error) return next(new AppError(error.message, 500));
  res.json({ success: true, data });
};

exports.addExpense = async (req, res, next) => {
  const { data, error } = await supabase.from('expenses').insert({ ...req.body, logged_by: req.user.id }).single();
  if (error) return next(new AppError(error.message, 500));
  res.status(201).json({ success: true, data });
};

exports.deleteExpense = async (req, res, next) => {
  const { error } = await supabase.from('expenses').delete().eq('id', req.params.id);
  if (error) return next(new AppError(error.message, 500));
  res.json({ success: true });
};

// Farmers
exports.getFarmers = async (req, res, next) => {
  const { data, error } = await supabase.from('farmers').select('*, farmer_visits(*)').order('created_at', { ascending: false });
  if (error) return next(new AppError(error.message, 500));
  res.json({ success: true, data });
};

exports.addFarmer = async (req, res, next) => {
  const { data, error } = await supabase.from('farmers').insert({ ...req.body, enrolled_by: req.user.id }).single();
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
  const { data, error } = await supabase.from('farmer_visits').insert({ farmer_id: id, ...req.body, visited_by: req.user.id }).single();
  if (error) return next(new AppError(error.message, 500));
  res.status(201).json({ success: true, data });
};

// Cash
exports.getCash = async (req, res, next) => {
  const { data, error } = await supabase.from('cash_balance').select('*').order('updated_at', { ascending: false }).limit(1);
  if (error) return next(new AppError(error.message, 500));
  res.json({ success: true, data: data[0] || null });
};

exports.updateCash = async (req, res, next) => {
  const { amount } = req.body;
  const { data, error } = await supabase.from('cash_balance').insert({ amount: parseFloat(amount), updated_by: req.user.id }).single();
  if (error) return next(new AppError(error.message, 500));
  res.json({ success: true, data });
};

// War Room
exports.generateBrief = async (req, res, next) => {
  const { week_ref } = req.body;
  // Fetch all relevant data (crops, expenses, farmers, cash)
  const [{ data: crops }, { data: expenses }, { data: farmers }, { data: cash }] = await Promise.all([
    supabase.from('crop_setups').select('*'),
    supabase.from('expenses').select('*'),
    supabase.from('farmers').select('*, farmer_visits(*)'),
    supabase.from('cash_balance').select('*').order('updated_at', { ascending: false }).limit(1),
  ]);

  // Build prompts and call Claude (similar to original logic)
  const briefText = await callClaude('...', '...'); // assemble data
  let briefJson;
  try {
    briefJson = JSON.parse(briefText.replace(/```json|```/g, ''));
  } catch { return next(new AppError('Failed to parse brief.', 500)); }

  // Store brief
  const { data, error } = await supabase.from('war_room_briefs').insert({
    week_ref,
    brief_json: briefJson,
    generated_by: req.user.id,
  }).single();
  if (error) return next(new AppError(error.message, 500));

  res.json({ success: true, data: { brief_json: briefJson, id: data.id } });
};

exports.getBriefs = async (req, res, next) => {
  const { data, error } = await supabase.from('war_room_briefs').select('*').order('created_at', { ascending: false });
  if (error) return next(new AppError(error.message, 500));
  res.json({ success: true, data });
};