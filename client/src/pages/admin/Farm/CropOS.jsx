import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/api';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';

const CROPS = [
  { id: 'musli', name: 'Safed Musli', emoji: '🌿', acres: 4, color: '#7c3aed', light: '#ede9fe',
    harvest: 'Nov-Dec 2026', revenue: 'Rs 20-40L',
    risks: ['White grub at root zone', 'Root rot from waterlogging', 'Poor tuber set if soil compacted'],
    weeks: { 4: 'Stand count + gap fill', 8: '1st weeding + N side-dress', 12: 'Tuber dev check', 16: 'Stop irrigation - harden', 20: 'Harvest' },
  },
  // ... define all other crops exactly as original
];

function weeksFrom(d) { return !d ? 0 : Math.max(0, Math.floor((Date.now() - new Date(d)) / 604800000)); }

export default function CropOS() {
  const queryClient = useQueryClient();
  const [activeCrop, setActiveCrop] = useState('musli');
  const [showObsModal, setShowObsModal] = useState(false);
  const [obsForm, setObsForm] = useState({
    date: new Date().toISOString().slice(0,10), health: 'Good', pest: 'No', water: 'Good', growth: 'On track', note: ''
  });

  // Fetch crop setups
    const { data: setups } = useQuery({
        queryKey: ['farm-crops'],
        queryFn: () => apiClient.get('/admin/farm/crops').then(r => r.data.data),
    });
  // Fetch observations for active crop
    const { data: observations } = useQuery({
        queryKey: ['farm-obs', activeCrop],
        queryFn: () => apiClient.get(`/admin/farm/crops/${activeCrop}/observations`).then(r => r.data.data),
    });

  const setup = setups?.find(s => s.crop_id === activeCrop);
  const weeks = weeksFrom(setup?.planting_date);
  const crop = CROPS.find(c => c.id === activeCrop);
  const nextMilestone = Object.entries(crop.weeks).find(([w]) => parseInt(w) >= weeks);

  // Mutations
  const saveSetup = useMutation({
    mutationFn: ({ cropId, data }) => apiClient.put(`/admin/farm/crops/${cropId}`, data),
    onSuccess: () => queryClient.invalidateQueries(['farm-crops']),
  });

  const genPOP = useMutation({
    mutationFn: (cropId) => apiClient.post(`/admin/farm/crops/${cropId}/pop`),
    onSuccess: () => queryClient.invalidateQueries(['farm-crops']),
  });

  const addObservation = useMutation({
    mutationFn: (data) => apiClient.post(`/admin/farm/crops/${activeCrop}/observations`, data),
    onSuccess: () => queryClient.invalidateQueries(['farm-obs']),
  });

  return (
    <div className="space-y-6">
      {/* Crop tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {CROPS.map(c => (
          <button key={c.id} onClick={() => setActiveCrop(c.id)}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-bold border-2 transition ${
              activeCrop === c.id ? 'border-current' : 'border-border text-muted'
            }`}
            style={activeCrop === c.id ? { borderColor: c.color, backgroundColor: c.light, color: c.color } : {}}
          >
            {c.emoji} {c.name.split(' ')[0]}<br/><span className="font-normal">{c.acres} ac</span>
          </button>
        ))}
      </div>

      {/* Crop header */}
      {crop && (
        <div className="rounded-xl p-5 text-white" style={{ backgroundColor: crop.color }}>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-3xl">{crop.emoji}</span>
              <h3 className="text-xl font-bold mt-1">{crop.name}</h3>
              <p className="text-xs opacity-80">{crop.acres} acres · Harvest: {crop.harvest} · {crop.revenue}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-mono font-bold">{weeks}</div>
              <div className="text-xs opacity-80">weeks in</div>
            </div>
          </div>
          {nextMilestone && (
            <div className="mt-3 bg-white/20 rounded-lg px-3 py-1 text-xs">
              Next milestone Week {nextMilestone[0]}: {nextMilestone[1]}
            </div>
          )}
        </div>
      )}

      {/* Planting date */}
      {!setup?.planting_date ? (
        <div className="bg-white p-4 rounded-lg border">
          <label className="block text-xs uppercase tracking-wider text-muted mb-2">Set Planting Date</label>
          <input type="date" onChange={(e) => saveSetup.mutate({ cropId: activeCrop, data: { planting_date: e.target.value } })}
            className="border rounded-sm p-2 w-full" />
        </div>
      ) : (
        <div className="bg-white p-3 rounded-lg border flex justify-between items-center text-sm">
          <span>Planted: <strong>{new Date(setup.planting_date).toLocaleDateString('en-IN')}</strong></span>
          <button onClick={() => saveSetup.mutate({ cropId: activeCrop, data: { planting_date: null } })} className="text-red-600 text-xs">Reset</button>
        </div>
      )}

      {/* POP */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-display text-lg">Week {weeks} Field Tasks</h3>
          <Button onClick={() => genPOP.mutate(activeCrop)} disabled={genPOP.isLoading || !setup?.planting_date}>
            {genPOP.isLoading ? 'Generating...' : 'Generate POP'}
          </Button>
        </div>
        {setup?.pop_json ? (
          <pre className="bg-cream p-3 rounded text-sm whitespace-pre-wrap font-sans">{setup.pop_json.text}</pre>
        ) : <p className="text-muted text-center py-4">Set planting date and generate POP.</p>}
      </div>

      {/* Observations */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-display text-lg">Weekly Observations</h3>
          <Button secondary onClick={() => setShowObsModal(true)}>+ Log Observation</Button>
        </div>
        {observations?.length === 0 ? <p className="text-muted text-center py-4">No observations yet.</p> : (
          observations?.slice(0, 5).map(ob => (
            <div key={ob.id} className="border-b py-2 text-sm">
              <span className="text-muted">{ob.date} · Wk {ob.week}</span>
              <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${
                ob.health === 'Excellent' || ob.health === 'Good' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>{ob.health}</span>
              {ob.pest !== 'No' && <span className="ml-2 text-red-600 text-xs">Pest: {ob.pest}</span>}
              {ob.note && <p className="mt-1">{ob.note}</p>}
            </div>
          ))
        )}

        {showObsModal && (
          <Modal onClose={() => setShowObsModal(false)}>
            <form onSubmit={(e) => { e.preventDefault(); addObservation.mutate({ ...obsForm, week: weeks }); setShowObsModal(false); }} className="space-y-3">
              <h3 className="text-xl font-display">Log Observation</h3>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted block">Date</label>
                <input type="date" value={obsForm.date} onChange={e => setObsForm({...obsForm, date: e.target.value})} className="border p-2 rounded-sm w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted block">Health</label>
                  <select value={obsForm.health} onChange={e => setObsForm({...obsForm, health: e.target.value})} className="border p-2 rounded-sm w-full">
                    {['Excellent','Good','Fair','Poor'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted block">Pest/Disease</label>
                  <select value={obsForm.pest} onChange={e => setObsForm({...obsForm, pest: e.target.value})} className="border p-2 rounded-sm w-full">
                    <option>No</option><option>Yes - minor</option><option>Yes - serious</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted block">Water</label>
                  <select value={obsForm.water} onChange={e => setObsForm({...obsForm, water: e.target.value})} className="border p-2 rounded-sm w-full">
                    <option>Good</option><option>Too dry</option><option>Waterlogged</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted block">Growth</label>
                  <select value={obsForm.growth} onChange={e => setObsForm({...obsForm, growth: e.target.value})} className="border p-2 rounded-sm w-full">
                    <option>On track</option><option>Faster</option><option>Slower</option><option>No growth</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted block">Notes</label>
                <textarea value={obsForm.note} onChange={e => setObsForm({...obsForm, note: e.target.value})} rows={2} className="border p-2 rounded-sm w-full" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" secondary onClick={() => setShowObsModal(false)}>Cancel</Button>
                <Button type="submit" disabled={addObservation.isLoading}>Save</Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
}