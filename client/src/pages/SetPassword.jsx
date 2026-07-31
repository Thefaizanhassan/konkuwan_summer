import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import logo from '../assets/konkuwan_logo_primary.svg';
 
// Landing page for invitation & password-recovery links. Supabase (with
// detectSessionInUrl) turns the link's token into a session automatically;
// the user then chooses a password here.
export default function SetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
 
  useEffect(() => {
    let mounted = true;
    // The invite link fires an auth event once the token is consumed
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted && session) setHasSession(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) setHasSession(true);
      setReady(true);
    });
    return () => { mounted = false; subscription?.unsubscribe(); };
  }, []);
 
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError(t('auth.passwordTooShort'));
    if (password !== confirm) return setError(t('auth.passwordsDoNotMatch'));
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate('/admin'), 1500);
    } catch (err) {
      setError(err.message || t('auth.couldNotSetPassword'));
    } finally {
      setSaving(false);
    }
  };
 
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md border border-border">
        <div className="flex justify-center mb-6"><img src={logo} alt="Konkuwan Herbs" className="h-10" /></div>
        <h1 className="font-display text-2xl text-forest mb-1 text-center">{t('auth.setPassword')}</h1>
        <p className="text-sm text-muted text-center mb-6">{t('auth.setPasswordSubtitle')}</p>
 
        {!ready ? (
          <p className="text-center text-muted text-sm">{t('auth.validating')}</p>
        ) : done ? (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm text-center">
            ✓ {t('auth.passwordSet')}
          </div>
        ) : !hasSession ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm text-center">
            {t('auth.linkInvalid')}
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted mb-1">{t('auth.newPassword')}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password"
                className="w-full border border-border p-2.5 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-forest/30" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted mb-1">{t('auth.confirmPassword')}</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required autoComplete="new-password"
                className="w-full border border-border p-2.5 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-forest/30" />
            </div>
            <button type="submit" disabled={saving}
              className="w-full bg-forest text-white py-2.5 rounded-sm font-medium hover:bg-forest-mid transition disabled:opacity-60">
              {saving ? t('common.saving') : t('auth.setPasswordCta')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}