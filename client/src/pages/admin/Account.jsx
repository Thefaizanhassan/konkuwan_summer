import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { SUPPORTED_LANGUAGES } from '../../i18n';
 
// Account settings — language preference and password change.
// Supabase's updateUser does not verify the current password, so we
// re-authenticate with it first for safety.
export default function Account() {
  const { t, i18n } = useTranslation();
  const { user, setLanguage } = useAuth();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [langStatus, setLangStatus] = useState(null);
  const [langSaving, setLangSaving] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
 
  const changeLanguage = async (code) => {
    setLangStatus(null);
    setLangSaving(true);
    try {
      await setLanguage(code);
      setLangStatus({ type: 'success', msg: t('account.languageSaved') });
    } catch (err) {
      setLangStatus({ type: 'error', msg: err?.response?.data?.message || t('account.languageFailed') });
    } finally {
      setLangSaving(false);
    }
  };
 
  const submit = async (e) => {
    e.preventDefault();
    setStatus(null);
    if (form.next.length < 8) return setStatus({ type: 'error', msg: t('account.newPasswordTooShort') });
    if (form.next !== form.confirm) return setStatus({ type: 'error', msg: t('account.newPasswordsDoNotMatch') });
    setSaving(true);
    try {
      // Verify current password by re-authenticating
      const { error: authErr } = await supabase.auth.signInWithPassword({ email: user.email, password: form.current });
      if (authErr) throw new Error(t('account.currentPasswordWrong'));
      const { error } = await supabase.auth.updateUser({ password: form.next });
      if (error) throw error;
      setStatus({ type: 'success', msg: t('account.passwordUpdated') });
      setForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setStatus({ type: 'error', msg: err.message || t('account.couldNotUpdate') });
    } finally {
      setSaving(false);
    }
  };

  const field = 'w-full border border-border p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest/20';
  const banner = (s) =>
    `mb-4 px-4 py-3 rounded-lg text-sm ${s.type === 'success'
      ? 'bg-green-50 text-green-700 border border-green-200'
      : 'bg-red-50 text-red-700 border border-red-200'}`;
 
  const current = i18n.language || 'en';
 
  return (
    <div className="max-w-lg">
      <h2 className="font-display text-3xl text-forest mb-6">{t('account.title')}</h2>

      <div className="bg-white rounded-2xl border border-border p-6 mb-6">
        <h3 className="font-display text-lg text-forest mb-3">{t('account.profile')}</h3>
        <div className="text-sm space-y-1">
          <p><span className="text-muted">{t('common.name')}:</span> {user?.profile?.name || t('common.none')}</p>
          <p><span className="text-muted">{t('common.email')}:</span> {user?.email}</p>
          <p><span className="text-muted">{t('account.role')}:</span>{' '}
            {user?.profile?.role ? t(`users.roles.${user.profile.role}`, user.profile.role.replace(/_/g, ' ')) : t('common.none')}
          </p>
        </div>
      </div>
 
      {/* Language selector */}
      <div className="bg-white rounded-2xl border border-border p-6 mb-6">
        <h3 className="font-display text-lg text-forest mb-1">{t('account.language')}</h3>
        <p className="text-xs text-muted mb-4">{t('account.languageDesc')}</p>
        {langStatus && <div className={banner(langStatus)}>{langStatus.msg}</div>}
        <div className="flex gap-3 flex-wrap">
          {SUPPORTED_LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              disabled={langSaving}
              onClick={() => changeLanguage(l.code)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition disabled:opacity-60 ${
                current === l.code
                  ? 'border-forest bg-forest text-white'
                  : 'border-border text-forest hover:bg-cream'
              }`}
            >
              {l.nativeLabel}
              {l.nativeLabel !== l.label && <span className="opacity-70 ml-1.5">({l.label})</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border p-6">
        <h3 className="font-display text-lg text-forest mb-4">{t('account.changePassword')}</h3>
        {status && <div className={banner(status)}>{status.msg}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted mb-1">{t('account.currentPassword')}</label>
            <input type="password" value={form.current} onChange={set('current')} required autoComplete="current-password" className={field} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted mb-1">{t('account.newPassword')}</label>
            <input type="password" value={form.next} onChange={set('next')} required autoComplete="new-password" className={field} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted mb-1">{t('account.confirmNewPassword')}</label>
            <input type="password" value={form.confirm} onChange={set('confirm')} required autoComplete="new-password" className={field} />
          </div>
          <button type="submit" disabled={saving}
            className="bg-forest text-white px-5 py-2.5 rounded-xl font-medium hover:bg-forest-mid transition disabled:opacity-60">
            {saving ? t('account.updating') : t('account.updatePassword')}
          </button>
        </form>
      </div>
    </div>
  );
}