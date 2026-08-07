import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/api';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Papa from 'papaparse';
import { downloadCsv, stamp } from '../../../lib/csv';

// Emoji + colour are cosmetic — derived from the product name.
const cropEmoji = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('ginger') || n.includes('turmeric')) return '🫚';
  if (n.includes('moringa')) return '🌱';
  if (n.includes('mucuna')) return '🫛';
  if (n.includes('chia') || n.includes('seed')) return '🌾';
  return '🌿';
};
const PALETTE = ['#16a34a', '#7c3aed', '#d97706', '#0891b2', '#dc2626', '#4f46e5', '#0d9488', '#b45309', '#be185d', '#65a30d'];

// `label`/`short` are English fallbacks; the UI resolves
// t('farm.farmers.connectedContract' | 'farm.farmers.independent' | …).
const FARMER_TYPES = {
  connected: { labelKey: 'farm.farmers.connectedContract', shortKey: 'farm.farmers.connected', label: 'Connected / Contract', short: 'Connected', badge: 'bg-forest text-white' },
  independent: { labelKey: 'farm.farmers.independent', shortKey: 'farm.farmers.independent', label: 'Independent', short: 'Independent', badge: 'bg-cream-dark text-earth' },
};

export default function FarmerOS() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [editingTargets, setEditingTargets] = useState(false);
  const [targetDraft, setTargetDraft] = useState({});
  const [farmForm, setFarmForm] = useState({
    name: '', village: '', block: '', crop: '', area_decimal: '',
    seed_date: new Date().toISOString().slice(0, 10), phone: '',
    farmer_type: 'connected', by: 'CRP',
  });
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [visitForm, setVisitForm] = useState({ date: new Date().toISOString().slice(0,10), status: 'Good', note: '' });
  const [visitTarget, setVisitTarget] = useState(null);

  const { data: farmers } = useQuery({
    queryKey: ['farm-farmers'],
    queryFn: () => apiClient.get('/admin/farm/farmers').then(r => r.data.data),
  });

  const { data: cropOptions } = useQuery({
    queryKey: ['farm-crop-options'],
    queryFn: () => apiClient.get('/admin/farm/crop-options').then(r => r.data.data),
  });
 
  const { data: targets } = useQuery({
    queryKey: ['farm-targets'],
    queryFn: () => apiClient.get('/admin/farm/targets').then(r => r.data.data),
  });

  const saveTargets = useMutation({
    mutationFn: (draft) => apiClient.put('/admin/farm/targets', { targets: draft }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['farm-targets'] }); setEditingTargets(false); },
    onError: (err) => alert(err?.response?.data?.message || t('farm.farmers.targetsFailed')),
  });

  const enrollFarmer = useMutation({
    mutationFn: (data) => apiClient.post('/admin/farm/farmers', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['farm-farmers'] }); setShowForm(false); },
    onError: (err) => alert(err?.response?.data?.message || t('farm.farmers.enrollFailed')),
  });
  const logVisit = useMutation({
    mutationFn: ({ farmerId, data }) => apiClient.post(`/admin/farm/farmers/${farmerId}/visits`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['farm-farmers'] }); setVisitTarget(null); },
    onError: (err) => alert(err?.response?.data?.message || t('farm.farmers.visitFailed')),
  });
  const deleteFarmer = useMutation({
    mutationFn: (id) => apiClient.delete(`/admin/farm/farmers/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['farm-farmers'] }); setSelectedFarmer(null); },
  });

  // Coverage rows: one per active product + legacy crop values still on farmers
  const productCrops = (cropOptions || []).map((p, i) => ({
    crop: p.slug, label: p.name, emoji: cropEmoji(p.name), color: PALETTE[i % PALETTE.length],
  }));
  const knownSlugs = new Set(productCrops.map(c => c.crop));
  const legacyCrops = [...new Set((farmers || []).map(f => f.crop).filter(c => c && !knownSlugs.has(c)))]
    .map((c, i) => ({ crop: c, label: `${c} (legacy)`, emoji: cropEmoji(c), color: PALETTE[(productCrops.length + i) % PALETTE.length] }));
  const cropRows = [...productCrops, ...legacyCrops];

  const counts = {};
  cropRows.forEach(cr => { counts[cr.crop] = farmers?.filter(f => f.crop === cr.crop).length || 0; });

  // Search across name, phone, village, block, crop, type
  const q = search.trim().toLowerCase();
  const searched = !q ? farmers : farmers?.filter(f =>
    [f.name, f.phone, f.village, f.block, f.crop, f.farmer_type]
      .some(v => (v || '').toLowerCase().includes(q))
  );
  const filteredFarmers = filter === 'all' ? searched : searched?.filter(f => f.crop === filter);

  // CSV export — same behaviour/format as the Customers module
  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: res } = await apiClient.get('/admin/farm/farmers/export');
      const rows = res.data || [];
      if (!rows.length) return alert(t('farm.farmers.nothingToExport'));
      // downloadCsv neutralises cells that would be read as formulas — a
      // company name saved as =HYPERLINK(...) otherwise runs on open.
      downloadCsv(
        rows.map(r => ({
          ...r,
          created_at: r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '',
        })),
        `konkuwan-farmers-${stamp()}`
      );
    } catch (err) {
      alert(err?.response?.data?.message || t('farm.farmers.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const startEditTargets = () => {
    const draft = {};
    cropRows.forEach(cr => { draft[cr.crop] = targets?.[cr.crop] ?? ''; });
    setTargetDraft(draft);
    setEditingTargets(true);
  };

  // ── Farmer profile view ────────────────────────────────────────────────
  if (selectedFarmer) {
    const f = farmers?.find(x => x.id === selectedFarmer);
    if (!f) { setSelectedFarmer(null); return null; }
    const visits = [...(f.farmer_visits || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    const cropMeta = cropRows.find(cr => cr.crop === f.crop);
    const typeMeta = FARMER_TYPES[f.farmer_type] || FARMER_TYPES.connected;
    const weeksSinceSeed = f.seed_date ? Math.floor((Date.now() - new Date(f.seed_date)) / 604800000) : null;
    const lastVisit = visits[0];
    const weeksSinceVisit = lastVisit ? Math.floor((Date.now() - new Date(lastVisit.date)) / 604800000) : null;
 
    // Activity timeline: enrollment + every visit, newest first
    const timeline = [
      ...visits.map(v => ({
        when: v.created_at || v.date,
        date: v.date,
        title: `${t('farm.farmers.fieldVisit')} — ${v.status ? t(`farm.farmers.visitStatus.${v.status}`, v.status) : '—'}`,
        note: v.note,
        by: v.visitor?.name,
        icon: '📋',
      })),
      { when: f.created_at, date: f.created_at, title: t('farm.farmers.farmerEnrolled'), note: `${cropMeta?.label || f.crop} · ${f.area_decimal || '—'} ${t('farm.farmers.dec')}`, by: f.enroller?.name, icon: '🌱' },
    ];
 
    return (
      <div className="space-y-5">
        <button onClick={() => setSelectedFarmer(null)} className="text-sm text-sage hover:text-forest">← {t('farm.farmers.backToList')}</button>
 
        {/* Header */}
        <div className="bg-forest text-white rounded-xl p-5">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold">{f.name}</h3>
              <p className="text-sm opacity-80 mt-1">{f.village}{f.block ? ` · ${f.block}` : ''}{f.phone ? ` · ${f.phone}` : ''}</p>
              <div className="flex gap-2 mt-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20`}>{t(typeMeta.labelKey, typeMeta.label)}</span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20">{cropMeta?.emoji || '🌿'} {cropMeta?.label || f.crop}</span>
              </div>
            </div>
            <button onClick={() => { if (confirm(t('farm.farmers.confirmRemove', { name: f.name }))) deleteFarmer.mutate(f.id); }} className="text-white/60 hover:text-white text-sm">{t('farm.farmers.remove')}</button>
          </div>
        </div>
 
        {/* Details + stats */}
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-lg border p-4 text-center">
            <p className="text-2xl font-mono font-bold text-forest">{f.area_decimal != null ? Number(f.area_decimal) : '—'}</p>
            <p className="text-xs text-muted uppercase tracking-wider mt-1">{t('farm.farmers.areaDec')}</p>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <p className="text-xs text-muted uppercase tracking-wider mt-1">
              {f.seed_date
                ? t('farm.farmers.weeksSinceSeedingOn', { date: new Date(f.seed_date).toLocaleDateString('en-IN') })
                : t('farm.farmers.weeksSinceSeeding')}
            </p>
            <p className="text-xs text-muted uppercase tracking-wider mt-1">Weeks since seeding{f.seed_date ? ` (${new Date(f.seed_date).toLocaleDateString('en-IN')})` : ''}</p>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <p className="text-2xl font-mono font-bold text-forest">{visits.length}</p>
            <p className="text-xs text-muted uppercase tracking-wider mt-1">
              {weeksSinceVisit != null
                ? t('farm.farmers.visitsLast', { when: weeksSinceVisit === 0 ? t('farm.farmers.thisWeek') : t('farm.farmers.weeksAgo', { count: weeksSinceVisit }) })
                : t('farm.farmers.visits')}
            </p>
          </div>
        </div>
 
        {/* Log visit inline */}
        <div className="bg-white rounded-lg border p-4">
          {visitTarget === f.id ? (
            <div className="space-y-2">
              <h4 className="font-display text-lg">{t('farm.farmers.logVisit')}</h4>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={visitForm.date} onChange={e => setVisitForm({...visitForm, date: e.target.value})} />
                <select value={visitForm.status} onChange={e => setVisitForm({...visitForm, status: e.target.value})} className="border rounded-sm p-2">
                  {['Excellent','Good','Fair','Poor - needs help','Not planted'].map(v => <option key={v} value={v}>{t(`farm.farmers.visitStatus.${v}`, v)}</option>)}
                </select>
              </div>
              <Input placeholder={t('farm.farmers.notesPlaceholder')} value={visitForm.note} onChange={e => setVisitForm({...visitForm, note: e.target.value})} />
              <div className="flex gap-2">
                <Button onClick={() => logVisit.mutate({ farmerId: f.id, data: visitForm })} disabled={logVisit.isPending}>{t('farm.farmers.saveVisit')}</Button>
                <Button secondary onClick={() => setVisitTarget(null)}>{t('common.cancel')}</Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => { setVisitTarget(f.id); setVisitForm({ date: new Date().toISOString().slice(0,10), status: 'Good', note: '' }); }}>
              + {t('farm.farmers.logVisit')}
            </Button>
          )}
        </div>
 
        {/* Activity timeline */}
        <div className="bg-white rounded-lg border p-4">
          <h4 className="font-display text-lg mb-3">{t('farm.farmers.activityTimeline')}</h4>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted">{t('farm.farmers.noActivity')}</p>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
              {timeline.map((ev, i) => (
                <div key={i} className="relative pb-4 last:pb-0">
                  <span className="absolute -left-6 top-0 w-5 h-5 rounded-full bg-cream flex items-center justify-center text-[11px] border border-border">{ev.icon}</span>
                  <p className="text-sm font-medium">{ev.title}</p>
                  <p className="text-xs text-muted">
                    {ev.date ? new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    {ev.when && ev.when !== ev.date ? ` · ${t('farm.farmers.loggedAt', { datetime: new Date(ev.when).toLocaleString('en-IN') })}` : ''}
                    {ev.by ? ` · ${t('farm.farmers.by', { name: ev.by })}` : ''}
                  </p>
                  {ev.note && <p className="text-sm mt-1 bg-cream/60 rounded px-2 py-1 inline-block">{ev.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
 
  // ── List view ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Coverage bars with editable targets */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-display text-lg">{t('farm.farmers.coverage')}</h3>
          {editingTargets ? (
            <div className="flex gap-2">
              <Button onClick={() => saveTargets.mutate(targetDraft)} disabled={saveTargets.isPending}>
                {saveTargets.isPending ? t('common.saving') : t('farm.farmers.saveTargets')}
              </Button>
              <Button secondary onClick={() => setEditingTargets(false)}>{t('common.cancel')}</Button>
            </div>
          ) : (
            <Button secondary onClick={startEditTargets}>✎ {t('farm.farmers.editTargets')}</Button>
          )}
        </div>

        {cropRows.length === 0 && (
          <p className="text-sm text-muted">{t('farm.farmers.noCrops')}</p>
        )}

        {cropRows.map(cr => {
          const target = parseInt(targets?.[cr.crop]) || 0;
          return (
            <div key={cr.crop} className="mb-2">
              <div className="flex justify-between items-center text-xs mb-1">
                <span>{cr.emoji} {cr.label}</span>
                {editingTargets ? (
                  <input
                    type="number" min="0"
                    value={targetDraft[cr.crop] ?? ''}
                    onChange={e => setTargetDraft(d => ({ ...d, [cr.crop]: e.target.value }))}
                    placeholder={t('farm.farmers.targetPlaceholder')}
                    className="w-24 border border-border rounded px-2 py-1 text-xs text-right"
                  />
                ) : (
                  <span className="font-mono">
                    {counts[cr.crop]}{target > 0 ? `/${target}` : ''}
                    {target === 0 && <span className="text-muted ml-1">{t('farm.farmers.noTargetSet')}</span>}
                  </span>
                )}
              </div>
              <div className="h-2 rounded-full bg-cream-dark">
                <div className="h-2 rounded-full" style={{
                  width: target > 0 ? `${Math.min(100, (counts[cr.crop] / target) * 100)}%` : '0%',
                  backgroundColor: cr.color,
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Enroll form */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
          <h3 className="font-display text-lg">{t('farm.farmers.enrollFarmer')}</h3>
          <div className="flex gap-2">
            <Button secondary onClick={handleExport} disabled={exporting}>{exporting ? t('common.exporting') : `⬇ ${t('common.exportCsv')}`}</Button>
            <Button secondary onClick={() => setImportOpen(true)}>⬆ {t('common.importCsv')}</Button>
            <Button secondary onClick={() => setShowForm(!showForm)}>{showForm ? t('common.cancel') : `+ ${t('common.add')}`}</Button>
          </div>
        </div>
        {showForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!farmForm.crop) return alert(t('farm.farmers.selectCropAlert'));
              enrollFarmer.mutate({ ...farmForm, area_decimal: parseFloat(farmForm.area_decimal) || null });
            }}
            className="grid grid-cols-2 gap-3"
          >
            <Input required placeholder={t('common.name')} value={farmForm.name} onChange={e => setFarmForm({...farmForm, name: e.target.value})} />
            <Input placeholder={t('common.phone')} value={farmForm.phone} onChange={e => setFarmForm({...farmForm, phone: e.target.value})} />
            <Input required placeholder={t('farm.farmers.village')} value={farmForm.village} onChange={e => setFarmForm({...farmForm, village: e.target.value})} />
            <Input placeholder={t('farm.farmers.block')} value={farmForm.block} onChange={e => setFarmForm({...farmForm, block: e.target.value})} />
            <select required value={farmForm.crop} onChange={e => setFarmForm({...farmForm, crop: e.target.value})} className="border rounded-sm p-2">
              <option value="">{t('farm.farmers.selectCrop')}</option>
              {productCrops.map(cr => <option key={cr.crop} value={cr.crop}>{cr.emoji} {cr.label}</option>)}
            </select>
            <select value={farmForm.farmer_type} onChange={e => setFarmForm({...farmForm, farmer_type: e.target.value})} className="border rounded-sm p-2">
              <option value="connected">{t('farm.farmers.connectedFarmer')}</option>
              <option value="independent">{t('farm.farmers.independentFarmer')}</option>
            </select>
            <Input type="number" placeholder={t('farm.farmers.areaDec')} value={farmForm.area_decimal} onChange={e => setFarmForm({...farmForm, area_decimal: e.target.value})} />
            <Input type="date" value={farmForm.seed_date} onChange={e => setFarmForm({...farmForm, seed_date: e.target.value})} />
            <select value={farmForm.by} onChange={e => setFarmForm({...farmForm, by: e.target.value})} className="border rounded-sm p-2 col-span-2">
              {['Rajeshwar','Roopali','Field Coordinator','Field Assistant','CRP','Accountant'].map(n => <option key={n}>{n}</option>)}
            </select>
            <div className="col-span-2">
              <Button type="submit" fullWidth disabled={enrollFarmer.isPending}>
                {enrollFarmer.isPending ? t('farm.farmers.enrolling') : t('farm.farmers.enrollFarmer')}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Search + filters */}
      <div>
        <Input
          placeholder={`🔍 ${t('farm.farmers.searchPlaceholder')}`}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex gap-2 overflow-x-auto pt-3 pb-1">
          <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded-full text-xs font-bold border-2 whitespace-nowrap ${filter==='all' ? 'bg-forest text-white border-forest' : 'border-border text-muted'}`}>
            👥 {t('farm.farmers.allFarmers')} ({searched?.length || 0})
          </button>
          {cropRows.map(cr => (
            <button key={cr.crop} onClick={() => setFilter(cr.crop)} className={`px-3 py-1 rounded-full text-xs font-bold border-2 whitespace-nowrap ${filter===cr.crop ? 'bg-forest text-white border-forest' : 'border-border text-muted'}`}>
              {cr.emoji} {cr.label} ({counts[cr.crop]})
            </button>
          ))}
        </div>
      </div>

      {/* Farmer list — click a card to open the full profile */}
      {filteredFarmers?.length === 0 && (
        <p className="text-sm text-muted text-center py-6">
          {q ? t('farm.farmers.noFarmersMatchQuery', { query: search }) : t('farm.farmers.noFarmersMatch')}
        </p>
      )}
      {filteredFarmers?.map(f => {
        const visits = f.farmer_visits || [];
        const lastVisit = [...visits].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-1)[0];
        const weeksSinceVisit = lastVisit ? Math.floor((Date.now() - new Date(lastVisit.date)) / 604800000) : null;
        const needsVisit = weeksSinceVisit === null || weeksSinceVisit > 2;
        const cropMeta = cropRows.find(cr => cr.crop === f.crop);
        const typeMeta = FARMER_TYPES[f.farmer_type] || FARMER_TYPES.connected;

        return (
          <button
            key={f.id}
            type="button"
            onClick={() => setSelectedFarmer(f.id)}
            className={`w-full text-left bg-white p-4 rounded-lg border-l-4 hover:shadow-md transition ${needsVisit ? 'border-yellow-500' : 'border-green-500'}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold flex items-center gap-2">
                  {f.name}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeMeta.badge}`}>{t(typeMeta.shortKey, typeMeta.short)}</span>
                </h4>
                <p className="text-sm text-muted">{f.village}{f.block ? ' · ' + f.block : ''} {f.phone ? ' · ' + f.phone : ''}</p>
                <p className="text-xs mt-1">
                  <span className="font-semibold">{cropMeta?.emoji || '🌿'} {cropMeta?.label || f.crop}</span>
                  {f.area_decimal && <span className="ml-2">{f.area_decimal} {t('farm.farmers.dec')}</span>}
                  {f.seed_date && <span className="ml-2">{t('farm.farmers.seeds')}: {new Date(f.seed_date).toLocaleDateString('en-IN')}</span>}
                </p>
                {lastVisit && (
                  <p className="text-xs mt-1">
                    {t('farm.farmers.lastVisitStatus')}: {weeksSinceVisit === 0 ? t('farm.farmers.thisWeek') : t('farm.farmers.weeksAgo', { count: weeksSinceVisit })} - {t(`farm.farmers.visitStatus.${lastVisit.status}`, lastVisit.status)}
                  </p>
                )}
              </div>
              <span className="text-sage text-sm">{t('farm.farmers.viewProfile')} →</span>
            </div>
          </button>
        );
      })}
 
      {importOpen && (
        <ImportFarmersModal
          onClose={() => setImportOpen(false)}
          onDone={() => queryClient.invalidateQueries({ queryKey: ['farm-farmers'] })}
        />
      )}
    </div>
  );
}
 
// Bulk CSV import — same UX and contract as the Customers import.
// Accepted headers (case-insensitive): name, phone, village, block, crop,
// area_decimal, seed_date, farmer_type
function ImportFarmersModal({ onClose, onDone }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);
 
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: ({ data, errors }) => {
        setParseErrors(errors.map(er => `${t('farm.farmers.rowLabel')} ${er.row + 1}: ${er.message}`));
        setRows(data.filter(r => Object.values(r).some(v => String(v || '').trim() !== '')));
        setSummary(null);
      },
    });
  };
 
  const runImport = async () => {
    setBusy(true);
    try {
      const payload = rows.map(r => ({
        name: r.name?.trim(),
        phone: r.phone || null,
        village: r.village || null,
        block: r.block || null,
        crop: r.crop || null,
        area_decimal: r.area_decimal ? parseFloat(r.area_decimal) : null,
        seed_date: r.seed_date || null,
        farmer_type: ['connected', 'independent'].includes((r.farmer_type || '').toLowerCase())
          ? r.farmer_type.toLowerCase() : 'connected',
      }));
      const { data } = await apiClient.post('/admin/farm/farmers/import', { farmers: payload });
      setSummary(data.data);
      onDone();
    } catch (err) {
      setSummary({ imported: 0, skipped: rows.length, errors: [{ row: '—', reason: err?.response?.data?.message || t('farm.farmers.importFailed') }] });
    } finally {
      setBusy(false);
    }
  };
 
  return (
    <Modal onClose={onClose}>
      <div className="space-y-4">
        <h3 className="font-display text-xl text-forest">{t('farm.farmers.importTitle')}</h3>
        <p className="text-xs text-muted">{t('farm.farmers.importHelp')}</p>
        <input type="file" accept=".csv,text/csv" onChange={handleFile}
          className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-sm file:border-0 file:bg-forest file:text-white" />
 
        {parseErrors.length > 0 && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-sm p-2 max-h-24 overflow-auto">
            {parseErrors.map((e, i) => <div key={i}>{e}</div>)}
          </div>
        )}
 
        {rows.length > 0 && !summary && (
          <p className="text-sm">{t('farm.farmers.parsedRows', { count: rows.length })}</p>
        )}
 
        {summary && (
          <div className="text-sm bg-cream rounded-sm p-3 space-y-1">
            <p>✅ {t('common.imported')}: <strong>{summary.imported}</strong></p>
            <p>⏭ {t('common.skipped')}: <strong>{summary.skipped}</strong></p>
            {summary.errors?.length > 0 && (
              <div className="max-h-32 overflow-auto text-xs text-muted mt-2">
                {summary.errors.map((e, i) => <div key={i}>{t('farm.farmers.rowLabel')} {e.row} ({e.name || '—'}): {e.reason}</div>)}
              </div>
            )}
          </div>
        )}
 
        <div className="flex justify-end gap-3">
          <Button type="button" secondary onClick={onClose}>{summary ? t('common.close') : t('common.cancel')}</Button>
          {!summary && <Button onClick={runImport} disabled={!rows.length || busy}>{busy ? t('common.importing') : t('farm.farmers.importRows', { count: rows.length })}</Button>}
        </div>
      </div>
    </Modal>
  );
}