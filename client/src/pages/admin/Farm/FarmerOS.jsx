import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/api';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

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

export default function FarmerOS() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [editingTargets, setEditingTargets] = useState(false);
  const [targetDraft, setTargetDraft] = useState({});
  const [farmForm, setFarmForm] = useState({
    name: '', village: '', block: '', crop: '', area_decimal: '', seed_date: new Date().toISOString().slice(0,10), phone: '', by: 'CRP'
  });
  const [visitForm, setVisitForm] = useState({ date: new Date().toISOString().slice(0,10), status: 'Good', note: '' });
  const [visitTarget, setVisitTarget] = useState(null);

  const { data: farmers } = useQuery({
    queryKey: ['farm-farmers'],
    queryFn: () => apiClient.get('/admin/farm/farmers').then(r => r.data.data),
  });
 
  // Crop list comes from the products you added (active only) — not hardcoded.
  const { data: cropOptions } = useQuery({
    queryKey: ['farm-crop-options'],
    queryFn: () => apiClient.get('/admin/farm/crop-options').then(r => r.data.data),
  });
 
  // Coverage targets are stored in settings (farm_targets) and editable here.
  const { data: targets } = useQuery({
    queryKey: ['farm-targets'],
    queryFn: () => apiClient.get('/admin/farm/targets').then(r => r.data.data),
  });
 
  const saveTargets = useMutation({
    mutationFn: (t) => apiClient.put('/admin/farm/targets', { targets: t }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farm-targets'] });
      setEditingTargets(false);
    },
    onError: (err) => alert(err?.response?.data?.message || 'Failed to save targets.'),
  });

  const enrollFarmer = useMutation({
    mutationFn: (data) => apiClient.post('/admin/farm/farmers', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['farm-farmers'] }); setShowForm(false); },
    onError: (err) => alert(err?.response?.data?.message || 'Failed to enroll farmer.'),
  });
  const logVisit = useMutation({
    mutationFn: ({ farmerId, data }) => apiClient.post(`/admin/farm/farmers/${farmerId}/visits`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['farm-farmers'] }); setVisitTarget(null); },
  });
  const deleteFarmer = useMutation({
    mutationFn: (id) => apiClient.delete(`/admin/farm/farmers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['farm-farmers'] }),
  });

  // Build the coverage rows: one per active product, plus any legacy crop
  // values still present on enrolled farmers (so old data stays visible).
  const productCrops = (cropOptions || []).map((p, i) => ({
    crop: p.slug,
    label: p.name,
    emoji: cropEmoji(p.name),
    color: PALETTE[i % PALETTE.length],
  }));
  const knownSlugs = new Set(productCrops.map(c => c.crop));
  const legacyCrops = [...new Set((farmers || []).map(f => f.crop).filter(c => c && !knownSlugs.has(c)))]
    .map((c, i) => ({ crop: c, label: `${c} (legacy)`, emoji: cropEmoji(c), color: PALETTE[(productCrops.length + i) % PALETTE.length] }));
  const cropRows = [...productCrops, ...legacyCrops];

  const counts = {};
  cropRows.forEach(t => { counts[t.crop] = farmers?.filter(f => f.crop === t.crop).length || 0; });

  const filteredFarmers = filter === 'all' ? farmers : farmers?.filter(f => f.crop === filter);

  const startEditTargets = () => {
    const draft = {};
    cropRows.forEach(t => { draft[t.crop] = targets?.[t.crop] ?? ''; });
    setTargetDraft(draft);
    setEditingTargets(true);
  };

  return (
    <div className="space-y-6">
      {/* Coverage bars */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-display text-lg">Farmer Coverage</h3>
          {editingTargets ? (
            <div className="flex gap-2">
              <Button onClick={() => saveTargets.mutate(targetDraft)} disabled={saveTargets.isPending}>
                {saveTargets.isPending ? 'Saving…' : 'Save targets'}
              </Button>
              <Button secondary onClick={() => setEditingTargets(false)}>Cancel</Button>
            </div>
          ) : (
            <Button secondary onClick={startEditTargets}>✎ Edit targets</Button>
          )}
        </div>
 
        {cropRows.length === 0 && (
          <p className="text-sm text-muted">
            No crops yet — add products in Admin → Products and they will appear here.
          </p>
        )}
 
        {cropRows.map(t => {
          const target = parseInt(targets?.[t.crop]) || 0;
          return (
            <div key={t.crop} className="mb-2">
              <div className="flex justify-between items-center text-xs mb-1">
                <span>{t.emoji} {t.label}</span>
                {editingTargets ? (
                  <input
                    type="number" min="0"
                    value={targetDraft[t.crop] ?? ''}
                    onChange={e => setTargetDraft(d => ({ ...d, [t.crop]: e.target.value }))}
                    placeholder="target"
                    className="w-24 border border-border rounded px-2 py-1 text-xs text-right"
                  />
                ) : (
                  <span className="font-mono">
                    {counts[t.crop]}{target > 0 ? `/${target}` : ''}
                    {target === 0 && <span className="text-muted ml-1">(no target set)</span>}
                  </span>
                )}
              </div>
              <div className="h-2 rounded-full bg-cream-dark">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: target > 0 ? `${Math.min(100, (counts[t.crop] / target) * 100)}%` : '0%',
                    backgroundColor: t.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Enroll form */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-display text-lg">Enroll Farmer</h3>
          <Button secondary onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add'}</Button>
        </div>
        {showForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!farmForm.crop) return alert('Please select a crop.');
              enrollFarmer.mutate({ ...farmForm, area_decimal: parseFloat(farmForm.area_decimal) || null });
            }}
            className="grid grid-cols-2 gap-3"
          >
            <Input required placeholder="Name" value={farmForm.name} onChange={e => setFarmForm({...farmForm, name: e.target.value})} />
            <Input placeholder="Phone" value={farmForm.phone} onChange={e => setFarmForm({...farmForm, phone: e.target.value})} />
            <Input required placeholder="Village" value={farmForm.village} onChange={e => setFarmForm({...farmForm, village: e.target.value})} />
            <Input placeholder="Block/GP" value={farmForm.block} onChange={e => setFarmForm({...farmForm, block: e.target.value})} />
            <select required value={farmForm.crop} onChange={e => setFarmForm({...farmForm, crop: e.target.value})} className="border rounded-sm p-2">
              <option value="">Select crop…</option>
              {productCrops.map(t => <option key={t.crop} value={t.crop}>{t.emoji} {t.label}</option>)}
            </select>
            <Input type="number" placeholder="Area (dec)" value={farmForm.area_decimal} onChange={e => setFarmForm({...farmForm, area_decimal: e.target.value})} />
            <Input type="date" value={farmForm.seed_date} onChange={e => setFarmForm({...farmForm, seed_date: e.target.value})} />
            <select value={farmForm.by} onChange={e => setFarmForm({...farmForm, by: e.target.value})} className="border rounded-sm p-2">
              {['Rajeshwar','Roopali','Field Coordinator','Field Assistant','CRP','Accountant'].map(n => <option key={n}>{n}</option>)}
            </select>
            <div className="col-span-2">
              <Button type="submit" fullWidth disabled={enrollFarmer.isPending}>
                {enrollFarmer.isPending ? 'Enrolling…' : 'Enroll Farmer'}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${filter==='all' ? 'bg-forest text-white border-forest' : 'border-border text-muted'}`}>
          👥 All ({farmers?.length || 0})
        </button>
        {cropRows.map(t => (
          <button key={t.crop} onClick={() => setFilter(t.crop)} className={`px-3 py-1 rounded-full text-xs font-bold border-2 whitespace-nowrap ${filter===t.crop ? 'bg-forest text-white border-forest' : 'border-border text-muted'}`}>
            {t.emoji} {t.label} ({counts[t.crop]})
          </button>
        ))}
      </div>

      {/* Farmer list */}
      {filteredFarmers?.map(f => {
        const visits = f.farmer_visits || f.visits || [];
        const lastVisit = [...visits].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-1)[0];
        const weeksSinceVisit = lastVisit ? Math.floor((Date.now() - new Date(lastVisit.date)) / 604800000) : null;
        const needsVisit = weeksSinceVisit === null || weeksSinceVisit > 2;
        const cropMeta = cropRows.find(t => t.crop === f.crop);

        return (
          <div key={f.id} className={`bg-white p-4 rounded-lg border-l-4 ${needsVisit ? 'border-yellow-500' : 'border-green-500'}`}>
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold">{f.name}</h4>
                <p className="text-sm text-muted">{f.village}{f.block ? ' · ' + f.block : ''} {f.phone ? ' · ' + f.phone : ''}</p>
                <p className="text-xs mt-1">
                  <span className="font-semibold">{cropMeta?.emoji || '🌿'} {cropMeta?.label || f.crop}</span>
                  {f.area_decimal && <span className="ml-2">{f.area_decimal} dec</span>}
                  {f.seed_date && <span className="ml-2">Seeds: {new Date(f.seed_date).toLocaleDateString('en-IN')}</span>}
                </p>
                {lastVisit && (
                  <p className="text-xs mt-1">
                    Last visit: {weeksSinceVisit === 0 ? 'This week' : `${weeksSinceVisit}w ago`} - {lastVisit.status}
                  </p>
                )}
              </div>
              <button onClick={() => { if (confirm(`Remove farmer ${f.name}?`)) deleteFarmer.mutate(f.id); }} className="text-red-500 text-lg">&times;</button>
            </div>

            {visitTarget === f.id ? (
              <div className="mt-3 bg-cream p-3 rounded space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" value={visitForm.date} onChange={e => setVisitForm({...visitForm, date: e.target.value})} />
                  <select value={visitForm.status} onChange={e => setVisitForm({...visitForm, status: e.target.value})} className="border rounded-sm p-2">
                    {['Excellent','Good','Fair','Poor - needs help','Not planted'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <Input placeholder="Notes" value={visitForm.note} onChange={e => setVisitForm({...visitForm, note: e.target.value})} />
                <div className="flex gap-2">
                  <Button onClick={() => logVisit.mutate({ farmerId: f.id, data: visitForm })}>Save Visit</Button>
                  <Button secondary onClick={() => setVisitTarget(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button secondary className="mt-3" onClick={() => { setVisitTarget(f.id); setVisitForm({ date: new Date().toISOString().slice(0,10), status: 'Good', note: '' }); }}>
                Log Visit
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}