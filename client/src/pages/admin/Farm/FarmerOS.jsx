import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/api';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const CROP_TARGETS = [
  { crop: 'moringa', label: 'Moringa', target: 1000, emoji: '🌱', color: '#16a34a' },
  { crop: 'mucuna', label: 'Mucuna', target: 300, emoji: '🫛', color: '#7c3aed' },
  { crop: 'ginger', label: 'Ginger', target: 100, emoji: '🫚', color: '#d97706' },
  { crop: 'musli', label: 'Safed Musli', target: 100, emoji: '🌿', color: '#0891b2' },
];

export default function FarmerOS() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [farmForm, setFarmForm] = useState({
    name: '', village: '', block: '', crop: 'moringa', area_decimal: '', seed_date: new Date().toISOString().slice(0,10), phone: '', by: 'CRP'
  });
  const [visitForm, setVisitForm] = useState({ date: new Date().toISOString().slice(0,10), status: 'Good', note: '' });
  const [visitTarget, setVisitTarget] = useState(null);

  const { data: farmers } = useQuery(['farm-farmers'], () => apiClient.get('/admin/farm/farmers').then(r => r.data.data));

  const enrollFarmer = useMutation({
    mutationFn: (data) => apiClient.post('/admin/farm/farmers', data),
    onSuccess: () => { queryClient.invalidateQueries(['farm-farmers']); setShowForm(false); },
  });
  const logVisit = useMutation({
    mutationFn: ({ farmerId, data }) => apiClient.post(`/admin/farm/farmers/${farmerId}/visits`, data),
    onSuccess: () => { queryClient.invalidateQueries(['farm-farmers']); setVisitTarget(null); },
  });
  const deleteFarmer = useMutation({
    mutationFn: (id) => apiClient.delete(`/admin/farm/farmers/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['farm-farmers']),
  });

  const counts = {};
  CROP_TARGETS.forEach(t => { counts[t.crop] = farmers?.filter(f => f.crop === t.crop).length || 0; });

  const filteredFarmers = filter === 'all' ? farmers : farmers?.filter(f => f.crop === filter);

  return (
    <div className="space-y-6">
      {/* Coverage bars */}
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="font-display text-lg mb-3">Farmer Coverage</h3>
        {CROP_TARGETS.map(t => (
          <div key={t.crop} className="mb-2">
            <div className="flex justify-between text-xs mb-1">
              <span>{t.emoji} {t.label}</span>
              <span className="font-mono">{counts[t.crop]}/{t.target}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200">
              <div className="h-2 rounded-full" style={{ width: `${Math.min(100, (counts[t.crop]/t.target)*100)}%`, backgroundColor: t.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Enroll form */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-display text-lg">Enroll Farmer</h3>
          <Button secondary onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add'}</Button>
        </div>
        {showForm && (
          <form onSubmit={(e) => { e.preventDefault(); enrollFarmer.mutate({ ...farmForm, area_decimal: parseFloat(farmForm.area_decimal) }); }} className="grid grid-cols-2 gap-3">
            <Input required placeholder="Name" value={farmForm.name} onChange={e => setFarmForm({...farmForm, name: e.target.value})} />
            <Input placeholder="Phone" value={farmForm.phone} onChange={e => setFarmForm({...farmForm, phone: e.target.value})} />
            <Input required placeholder="Village" value={farmForm.village} onChange={e => setFarmForm({...farmForm, village: e.target.value})} />
            <Input placeholder="Block/GP" value={farmForm.block} onChange={e => setFarmForm({...farmForm, block: e.target.value})} />
            <select value={farmForm.crop} onChange={e => setFarmForm({...farmForm, crop: e.target.value})} className="border rounded-sm p-2">
              {CROP_TARGETS.map(t => <option key={t.crop} value={t.crop}>{t.emoji} {t.label}</option>)}
            </select>
            <Input type="number" placeholder="Area (dec)" value={farmForm.area_decimal} onChange={e => setFarmForm({...farmForm, area_decimal: e.target.value})} />
            <Input type="date" value={farmForm.seed_date} onChange={e => setFarmForm({...farmForm, seed_date: e.target.value})} />
            <select value={farmForm.by} onChange={e => setFarmForm({...farmForm, by: e.target.value})} className="border rounded-sm p-2">
              {['Rajeshwar','Roopali','Field Coordinator','Field Assistant','CRP','Accountant'].map(n => <option key={n}>{n}</option>)}
            </select>
            <div className="col-span-2">
              <Button type="submit" fullWidth>Enroll Farmer</Button>
            </div>
          </form>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${filter==='all' ? 'bg-forest text-white border-forest' : 'border-border text-muted'}`}>
          👥 All ({farmers?.length || 0})
        </button>
        {CROP_TARGETS.map(t => (
          <button key={t.crop} onClick={() => setFilter(t.crop)} className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${filter===t.crop ? 'bg-forest text-white border-forest' : 'border-border text-muted'}`}>
            {t.emoji} {t.label} ({counts[t.crop]})
          </button>
        ))}
      </div>

      {/* Farmer list */}
      {filteredFarmers?.map(f => {
        const lastVisit = f.visits?.slice(-1)[0];
        const weeksSinceVisit = lastVisit ? Math.floor((Date.now() - new Date(lastVisit.date)) / 604800000) : null;
        const needsVisit = weeksSinceVisit === null || weeksSinceVisit > 2;

        return (
          <div key={f.id} className={`bg-white p-4 rounded-lg border-l-4 ${needsVisit ? 'border-yellow-500' : 'border-green-500'}`}>
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold">{f.name}</h4>
                <p className="text-sm text-muted">{f.village}{f.block ? ' · ' + f.block : ''} {f.phone ? ' · ' + f.phone : ''}</p>
                <p className="text-xs mt-1">
                  <span className="font-semibold">{CROP_TARGETS.find(t => t.crop === f.crop)?.emoji} {f.crop}</span>
                  {f.area_decimal && <span className="ml-2">{f.area_decimal} dec</span>}
                  <span className="ml-2">Seeds: {new Date(f.seed_date).toLocaleDateString('en-IN')}</span>
                </p>
                {lastVisit && (
                  <p className="text-xs mt-1">
                    Last visit: {weeksSinceVisit === 0 ? 'This week' : `${weeksSinceVisit}w ago`} - {lastVisit.status}
                  </p>
                )}
              </div>
              <button onClick={() => deleteFarmer.mutate(f.id)} className="text-red-500 text-lg">&times;</button>
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