const supabase = require('../config/supabase');
const auditLog = require('../utils/audit');

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

exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, is_active, name } = req.body;

    const { data, error } = await supabase
      .from('profiles')
      .update({
        role,
        is_active,
        name,
      })
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
    const { email, role = 'viewer' } = req.body;

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

    await auditLog({ user: req.user, action: 'INVITE', entity_type: 'user', entity_id: data?.user?.id, new_values: { email, role }, ip_address: req.ip });

    return res.status(200).json({
      success: true,
      message: 'Invitation sent successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
};