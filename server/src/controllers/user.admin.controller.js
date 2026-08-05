const supabase = require('../config/supabase');
const auditLog = require('../utils/audit');
const AppError = require('../utils/AppError');

exports.listUsers = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

const { WIDGET_KEYS } = require('../utils/dashboardWidgets');
 
const ROLES = ['super_admin', 'product_manager', 'order_manager', 'farm_manager', 'viewer', 'stakeholder'];
 
// Only keys the registry knows about, so a crafted request cannot invent a
// widget or smuggle arbitrary JSON into the column.
const sanitiseWidgets = (value) =>
  Array.isArray(value) ? [...new Set(value.filter((k) => WIDGET_KEYS.includes(k)))] : [];

exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, is_active, name, dashboard_widgets } = req.body;
 
    if (role && !ROLES.includes(role)) {
      return next(new AppError(`Unknown role "${role}".`, 400));
    }
 
    const patch = { role, is_active, name };
    // Only a stakeholder carries widget grants. Moving someone off the role
    // clears them, so a later move back does not silently restore old access.
    if (role === 'stakeholder') {
      patch.dashboard_widgets = sanitiseWidgets(dashboard_widgets);
    } else if (role) {
      patch.dashboard_widgets = null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await auditLog({ user: req.user, action: 'UPDATE', entity_type: 'user', entity_id: id, new_values: { role, is_active, name }, ip_address: req.ip });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

exports.deactivateUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('profiles')
      .update({
        is_active: false,
      })
      .eq('id', id);

    if (error) throw error;

    await auditLog({ user: req.user, action: 'DEACTIVATE', entity_type: 'user', entity_id: id, new_values: { is_active: false }, ip_address: req.ip });

    return res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
    });
  } catch (err) {
    next(err);
  }
};

exports.inviteUser = async (req, res, next) => {
  try {
    const { email, role = 'viewer', dashboard_widgets } = req.body;
    if (!ROLES.includes(role)) return next(new AppError(`Unknown role "${role}".`, 400));
    const widgets = role === 'stakeholder' ? sanitiseWidgets(dashboard_widgets) : null;

    // Redirect the invite link to our Set Password page. CORS_ORIGIN is the
    // site URL (must also be listed in Supabase Auth → URL Configuration →
    // Redirect URLs for the link to be accepted).
    const siteUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
    const { data, error } =
      await supabase.auth.admin.inviteUserByEmail(
        email,
        {
          data: { role },
          redirectTo: `${siteUrl}/set-password`,
        }
      );

    if (error) throw error;

    // The profile row is created by a trigger on auth.users, so the role and
    // any widget grants are written straight after the invite succeeds.
    if (data?.user?.id) {
      await supabase
        .from('profiles')
        .update({ role, dashboard_widgets: widgets })
        .eq('id', data.user.id);
    }
 
    await auditLog({ user: req.user, action: 'INVITE', entity_type: 'user', entity_id: data?.user?.id, new_values: { email, role, widgets: widgets?.length ?? null }, ip_address: req.ip });

    return res.status(200).json({
      success: true,
      message: 'Invitation sent successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
};
// The list of grantable dashboard widgets, so the invite screen shows exactly
// what the server will honour rather than a hardcoded copy that can drift.
exports.listDashboardWidgets = async (req, res) => {
  const { DASHBOARD_WIDGETS } = require('../utils/dashboardWidgets');
  res.json({
    success: true,
    data: DASHBOARD_WIDGETS.map(({ key, group }) => ({ key, group })),
  });
};