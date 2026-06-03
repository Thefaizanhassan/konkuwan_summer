const { Settings } = require('../models');
const AppError = require('../utils/AppError');

exports.getAllSettings = async (req, res, next) => {
  try {
    const settings = await Settings.findAll();
    // Transform to key-value object
    const result = {};
    settings.forEach(s => { result[s.key] = s.value; });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const { settings } = req.body; // array of { key, value } or object
    if (!settings || !Array.isArray(settings)) {
      return next(new AppError('Request body must contain a "settings" array.', 400));
    }
    for (const { key, value } of settings) {
      await Settings.upsert({ key, value });
    }
    const updated = await Settings.findAll();
    const result = {};
    updated.forEach(s => { result[s.key] = s.value; });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};