import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
 
// Account settings — change password. Supabase's updateUser does not verify
// the current password, so we re-authenticate with it first for safety.
export default function Account() {
  const { user } = useAuth();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
 
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
 
  const submit = async (e) => {
    e.preventDefault();
    setStatus(null);
    if (form.next.length < 8) return setStatus({ type: 'error', msg: 'New password must be at least 8 characters.' });
    if (form.next !== form.confirm) return setStatus({ type: 'error', msg: 'New passwords do not match.' });
    setSaving(true);
    try {
      // Verify current password by re-authenticating
      const { error: authErr } = await supabase.auth.signInWithPassword({ email: user.email, password: form.current });
      if (authErr) throw new Error('Current password is incorrect.');
      const { error } = await supabase.auth.updateUser({ password: form.next });
      if (error) throw error;
      setStatus({ type: 'success', msg: 'Password updated successfully.' });
      setForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setStatus({ type: 'error', msg: err.message || 'Could not update password.' });
    } finally {
      setSaving(false);
    }
  };
 
  const field = 'w-full border border-border p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest/20';
 
  return (
    <div className="max-w-lg">
      <h2 className="font-display text-3xl text-forest mb-6">My Account</h2>
 
      <div className="bg-white rounded-2xl border border-border p-6 mb-6">
        <h3 className="font-display text-lg text-forest mb-3">Profile</h3>
        <div className="text-sm space-y-1">
          <p><span className="text-muted">Name:</span> {user?.profile?.name || '—'}</p>
          <p><span className="text-muted">Email:</span> {user?.email}</p>
          <p><span className="text-muted">Role:</span> <span className="capitalize">{user?.profile?.role?.replace(/_/g, ' ') || '—'}</span></p>
        </div>
      </div>
 
      <div className="bg-white rounded-2xl border border-border p-6">
        <h3 className="font-display text-lg text-forest mb-4">Change Password</h3>
        {status && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {status.msg}
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted mb-1">Current Password</label>
            <input type="password" value={form.current} onChange={set('current')} required autoComplete="current-password" className={field} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted mb-1">New Password</label>
            <input type="password" value={form.next} onChange={set('next')} required autoComplete="new-password" className={field} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted mb-1">Confirm New Password</label>
            <input type="password" value={form.confirm} onChange={set('confirm')} required autoComplete="new-password" className={field} />
          </div>
          <button type="submit" disabled={saving}
            className="bg-forest text-white px-5 py-2.5 rounded-xl font-medium hover:bg-forest-mid transition disabled:opacity-60">
            {saving ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}