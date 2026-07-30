import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/api';
import Button from '../../components/ui/Button';

// Declarative settings schema — every key is stored as a row in the
// `settings` table. Add a field here and it becomes editable.
const SECTIONS = [
  {
    title: 'Company Profile',
    description: 'Used on invoices and the public site.',
    icon: '🏢',
    fields: [
      { key: 'company_name', label: 'Company Name', placeholder: 'Konkuwan Herbs' },
      { key: 'company_email', label: 'Contact Email', type: 'email', placeholder: 'info@konkuwanherbs.com' },
      { key: 'company_phone', label: 'Phone', placeholder: '+91 …' },
      { key: 'company_gstin', label: 'GSTIN', placeholder: '21XXXXX…' },
      { key: 'company_address', label: 'Address', type: 'textarea', span: 2 },
      { key: 'company_pan', label: 'PAN', placeholder: 'AAHCK3264E' },
    ],
  },
  {
    title: 'Bank Details (Invoice)',
    description: 'Shown in the Bank Details panel on generated invoices.',
    icon: '🏦',
    fields: [
      { key: 'bank_account_name', label: 'Account Holder Name', placeholder: 'Konkuwan Herbs' },
      { key: 'bank_account_number', label: 'Account Number' },
      { key: 'bank_ifsc', label: 'IFSC' },
      { key: 'bank_account_type', label: 'Account Type', placeholder: 'Current' },
      { key: 'bank_name', label: 'Bank', placeholder: 'Axis Bank' },
    ],
  },
  {
    title: 'AI Assistant',
    description: 'Provider used for Farm Ops AI features (POP generation, War Room briefs). API keys stay on the server in .env — only the choice of provider is stored here.',
    icon: '🤖',
    fields: [
      {
        key: 'ai_provider', label: 'Active Provider', type: 'select',
        options: [
          { value: 'claude', label: 'Claude (Anthropic)' },
          { value: 'openai', label: 'ChatGPT (OpenAI)' },
        ],
      },
      { key: 'ai_model_claude', label: 'Claude Model', placeholder: 'claude-sonnet-4-20250514' },
      { key: 'ai_model_openai', label: 'OpenAI Model', placeholder: 'gpt-4o-mini' },
    ],
  },
  {
    title: 'Farm Finance',
    description: 'Drives the EMI alert and "safe deploy" figure in Farm Ops → Finance.',
    icon: '💰',
    fields: [
      { key: 'emi_monthly_amount', label: 'Monthly EMI (₹)', type: 'number', placeholder: 'e.g. 646532' },
      { key: 'emi_start_date', label: 'EMI Start Date', type: 'date' },
      { key: 'emi_label', label: 'EMI Label', placeholder: 'HBF EMI' },
    ],
  },
  {
    title: 'Invoicing',
    description: 'Defaults applied when generating invoices.',
    icon: '🧾',
    fields: [
      { key: 'invoice_due_days', label: 'Payment Due (days)', type: 'number', placeholder: '30' },
      { key: 'invoice_tax_percent', label: 'Tax / GST (%)', type: 'number', placeholder: '18' },
      { key: 'invoice_terms', label: 'Invoice Terms (one per line)', type: 'textarea', span: 2 },
      { key: 'quotation_terms', label: 'Quotation Terms (one per line)', type: 'textarea', span: 2 },
    ],
  },
];
 
const KNOWN_KEYS = new Set(SECTIONS.flatMap(s => s.fields.map(f => f.key)));

export default function Settings() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiClient.get('/admin/settings').then(r => r.data),
  });

  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setForm(data.data); // { key: value }
  }, [data]);

  const updateSettings = useMutation({
    mutationFn: (settings) =>
      apiClient.put('/admin/settings', {
        settings: Object.entries(settings).map(([key, value]) => ({ key, value: value ?? '' })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err) => alert(err?.response?.data?.message || 'Failed to save settings.'),
  });

  const handleChange = (key, value) => {
    setSaved(false);
    setForm(f => ({ ...f, [key]: value }));
  };

  const isDirty = data && JSON.stringify(form) !== JSON.stringify(data.data);
  const otherKeys = Object.keys(form).filter(k => !KNOWN_KEYS.has(k));
 
  if (isLoading) return <p className="text-muted">Loading settings…</p>;
 
  const renderField = (f) => {
    const val = form[f.key] ?? '';
    const base = 'w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20';
    if (f.type === 'select') {
      return (
        <select value={val} onChange={e => handleChange(f.key, e.target.value)} className={base}>
          <option value="">Select…</option>
          {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    if (f.type === 'textarea') {
      return <textarea rows={2} value={val} onChange={e => handleChange(f.key, e.target.value)} placeholder={f.placeholder} className={base} />;
    }
    return <input type={f.type || 'text'} value={val} onChange={e => handleChange(f.key, e.target.value)} placeholder={f.placeholder} className={base} />;
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-3xl text-forest">System Settings</h2>
        {saved && <span className="text-sm text-green-700 bg-green-50 px-3 py-1 rounded-full">✓ Saved</span>}
      </div>
 
      <form
        onSubmit={(e) => { e.preventDefault(); updateSettings.mutate(form); }}
        className="space-y-6"
      >
        {SECTIONS.map(section => (
          <div key={section.title} className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-cream/40">
              <h3 className="font-display text-lg text-forest">{section.icon} {section.title}</h3>
              <p className="text-xs text-muted mt-1">{section.description}</p>
            </div>
            <div className="p-6 grid sm:grid-cols-2 gap-4">
              {section.fields.map(f => (
                <div key={f.key} className={f.span === 2 ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs uppercase tracking-wide text-muted mb-1">{f.label}</label>
                  {renderField(f)}
                </div>
              ))}
            </div>
            {section.title === 'AI Assistant' && (
              <div className="px-6 pb-4 -mt-2">
                <p className="text-xs text-muted">
                  Currently active: <span className="font-semibold text-forest">
                    {form.ai_provider === 'openai' ? 'ChatGPT (OpenAI)' : 'Claude (Anthropic)'}
                  </span>. Switch anytime — make sure the matching key
                  ({form.ai_provider === 'openai' ? 'OPENAI_API_KEY' : 'CLAUDE_API_KEY'}) is set in server/.env.
                </p>
              </div>
            )}
          </div>
        ))}
 
        {otherKeys.length > 0 && (
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-cream/40">
              <h3 className="font-display text-lg text-forest">🔧 Other Settings</h3>
              <p className="text-xs text-muted mt-1">Keys stored in the database that are not part of the sections above.</p>
            </div>
            <div className="p-6 grid sm:grid-cols-2 gap-4">
              {otherKeys.map(key => (
                <div key={key}>
                  <label className="block text-xs uppercase tracking-wide text-muted mb-1">{key.replace(/_/g, ' ')}</label>
                  <input
                    value={form[key] ?? ''}
                    onChange={e => handleChange(key, e.target.value)}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
 
        <div className="flex items-center gap-3 pb-8">
          <Button type="submit" disabled={updateSettings.isPending || !isDirty}>
            {updateSettings.isPending ? 'Saving…' : 'Save Settings'}
          </Button>
          {isDirty && (
            <button
              type="button"
              onClick={() => setForm(data.data)}
              className="text-sm text-muted hover:text-forest underline"
            >
              Discard changes
            </button>
          )}
        </div>
      </form>
    </div>
  );
}