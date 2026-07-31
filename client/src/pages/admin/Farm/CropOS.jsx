import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/api';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';

// Crops come from the Products list — nothing is hardcoded. Emoji/colour are
// cosmetic, derived from the product name.
const cropEmoji = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('ginger') || n.includes('turmeric')) return '🫚';
  if (n.includes('moringa')) return '🌱';
  if (n.includes('mucuna')) return '🫛';
  if (n.includes('chia') || n.includes('seed')) return '🌾';
  return '🌿';
};
const PALETTE = [
  { color: '#162F22', light: '#EAF0EC' },
  { color: '#4A7860', light: '#EAF0EC' },
  { color: '#B8844A', light: '#F4ECE0' },
  { color: '#6A9E7A', light: '#EAF0EC' },
  { color: '#0891b2', light: '#E0F2FE' },
  { color: '#7c3aed', light: '#EDE9FE' },
];

function weeksFrom(d) { return !d ? 0 : Math.max(0, Math.floor((Date.now() - new Date(d)) / 604800000)); }

export default function CropOS() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeCrop, setActiveCrop] = useState(null);
  const [showObsModal, setShowObsModal] = useState(false);
  const [areaDraft, setAreaDraft] = useState('');
  const [editingArea, setEditingArea] = useState(false);
  const [obsForm, setObsForm] = useState({
    date: new Date().toISOString().slice(0,10), health: 'Good', pest: 'No', water: 'Good', growth: 'On track', note: ''
  });

  // Crop list = active products (dynamic — every product added becomes a crop here)
  const { data: cropOptions } = useQuery({
    queryKey: ['farm-crop-options'],
    queryFn: () => apiClient.get('/admin/farm/crop-options').then(r => r.data.data),
  });
 
  const { data: setups } = useQuery({
    queryKey: ['farm-crops'],
    queryFn: () => apiClient.get('/admin/farm/crops').then(r => r.data.data),
  });
 
  const crops = (cropOptions || []).map((p, i) => ({
    id: p.slug,
    name: p.name,
    emoji: cropEmoji(p.name),
    ...PALETTE[i % PALETTE.length],
  }));
 
  // Select the first crop once the list loads
  useEffect(() => {
    if (!activeCrop && crops.length) setActiveCrop(crops[0].id);
  }, [crops, activeCrop]);
 
  const { data: observations } = useQuery({
    queryKey: ['farm-obs', activeCrop],
    queryFn: () => apiClient.get(`/admin/farm/crops/${activeCrop}/observations`).then(r => r.data.data),
    enabled: !!activeCrop,
  });

  const setup = setups?.find(s => s.crop_id === activeCrop);
  const weeks = weeksFrom(setup?.planting_date);
  const crop = crops.find(c => c.id === activeCrop);

  const saveSetup = useMutation({
    mutationFn: ({ cropId, data }) => apiClient.put(`/admin/farm/crops/${cropId}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['farm-crops'] }),
    onError: (err) => alert(err?.response?.data?.message || t('farm.crop.setupFailed')),
  });
 
  const deleteCropEntry = useMutation({
    mutationFn: (cropId) => apiClient.delete(`/admin/farm/crops/${cropId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['farm-crops'] }),
    onError: (err) => alert(err?.response?.data?.message || t('common.somethingWentWrong')),
  });

  const genPOP = useMutation({
    mutationFn: (cropId) => apiClient.post(`/admin/farm/crops/${cropId}/pop`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['farm-crops'] }),
    onError: (err) => alert(err?.response?.data?.message || t('farm.crop.popFailed')),
  });

  const addObservation = useMutation({
    mutationFn: (data) => apiClient.post(`/admin/farm/crops/${activeCrop}/observations`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['farm-obs', activeCrop] }),
    onError: (err) => alert(err?.response?.data?.message || t('common.somethingWentWrong')),
  });

  if (crops.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg border text-center text-muted text-sm">
        {t('farm.crop.noCrops')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Crop tabs — from products, with live acreage from the DB */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {crops.map(c => {
          const s = setups?.find(x => x.crop_id === c.id);
          return (
            <button key={c.id} onClick={() => { setActiveCrop(c.id); setEditingArea(false); }}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-bold border-2 transition ${
                activeCrop === c.id ? 'border-current' : 'border-border text-muted'
              }`}
              style={activeCrop === c.id ? { borderColor: c.color, backgroundColor: c.light, color: c.color } : {}}
            >
              {c.emoji} {c.name.split(' ')[0]}<br/>
              <span className="font-normal">{s?.area_acres != null ? `${Number(s.area_acres)} ac` : '— ac'}</span>
            </button>
          );
        })}
      </div>

      {/* Crop header */}
      {crop && (
        <div className="rounded p-5 text-white" style={{ backgroundColor: crop.color }}>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-3xl">{crop.emoji}</span>
              <h3 className="text-xl font-bold mt-1">{crop.name}</h3>
              <p className="text-xs opacity-80">
                {setup?.area_acres != null ? t('farm.crop.acresCultivated', { count: Number(setup.area_acres) }) : t('farm.crop.areaNotSet')}
                {setup?.planting_date ? ` · ${t('farm.crop.planted', { date: new Date(setup.planting_date).toLocaleDateString('en-IN') })}` : ''}
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-mono font-bold">{weeks}</div>
              <div className="text-xs opacity-80">{t('farm.crop.weeksIn')}</div>
            </div>
          </div>
        </div>
      )}

      {/* Area management — fully dynamic, stored in crop_setups.area_acres */}
      <div className="bg-white p-5 rounded border border-border">
        <div className="flex justify-between items-center">
          <h3 className="font-display text-lg">{t('farm.crop.cultivatedArea')}</h3>
          {setup && (
            <button
              onClick={() => { if (confirm(t('farm.crop.confirmDeleteCrop', { name: crop?.name }))) deleteCropEntry.mutate(activeCrop); }}
              className="text-red-600 text-xs hover:underline"
            >
              {t('farm.crop.deleteCropEntry')}
            </button>
          )}
        </div>
        {editingArea ? (
          <div className="flex gap-2 mt-3">
            <input
              type="number" min="0" step="0.25"
              value={areaDraft}
              onChange={e => setAreaDraft(e.target.value)}
              placeholder={t('farm.crop.acresPlaceholder')}
              className="border rounded-sm p-2 flex-1"
            />
            <Button onClick={() => { saveSetup.mutate({ cropId: activeCrop, data: { area_acres: areaDraft === '' ? null : parseFloat(areaDraft) } }); setEditingArea(false); }}>
              {t('common.save')}
            </Button>
            <Button secondary onClick={() => setEditingArea(false)}>{t('common.cancel')}</Button>
          </div>
        ) : (
          <div className="flex justify-between items-center mt-3 text-sm">
            <span>
              {setup?.area_acres != null
                ? <><strong className="text-lg font-mono">{Number(setup.area_acres)}</strong> {t('farm.crop.acres')}</>
                : <span className="text-muted">{t('farm.crop.noArea')}</span>}
            </span>
            <Button secondary onClick={() => { setAreaDraft(setup?.area_acres ?? ''); setEditingArea(true); }}>
              ✎ {setup?.area_acres != null ? t('farm.crop.editArea') : t('farm.crop.setArea')}
            </Button>
          </div>
        )}
      </div>
 
      {/* Planting date */}
      {!setup?.planting_date ? (
        <div className="bg-white p-5 rounded border border-border">
          <label className="block text-xs uppercase tracking-wider text-muted mb-2">{t('farm.crop.setPlantingDate')}</label>
          <input type="date" onChange={(e) => e.target.value && saveSetup.mutate({ cropId: activeCrop, data: { planting_date: e.target.value } })}
            className="border rounded-sm p-2 w-full" />
        </div>
      ) : (
        <div className="bg-white p-3 rounded-lg border flex justify-between items-center text-sm">
          <span>{t('farm.crop.plantedOn')}: <strong>{new Date(setup.planting_date).toLocaleDateString('en-IN')}</strong></span>
          <button onClick={() => saveSetup.mutate({ cropId: activeCrop, data: { planting_date: null } })} className="text-red-600 text-xs">{t('farm.crop.reset')}</button>
        </div>
      )}

      {/* POP */}
      <div className="bg-white p-5 rounded border border-border">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-display text-lg">{t('farm.crop.weekTasks', { week: weeks })}</h3>
          <Button onClick={() => genPOP.mutate(activeCrop)} disabled={genPOP.isPending || !setup?.planting_date}>
            {genPOP.isPending ? t('common.generating') : t('farm.crop.generatePop')}
          </Button>
        </div>
        {setup?.pop_json ? (
          <pre className="bg-cream p-3 rounded text-sm whitespace-pre-wrap font-sans">{setup.pop_json.text}</pre>
        ) : <p className="text-muted text-center py-4">{t('farm.crop.popEmpty')}</p>}
      </div>

      {/* Observations */}
      <div className="bg-white p-5 rounded border border-border">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-display text-lg">{t('farm.crop.observations')}</h3>
          <Button secondary onClick={() => setShowObsModal(true)}>+ {t('farm.crop.logObservation')}</Button>
        </div>
        {observations?.length === 0 ? <p className="text-muted text-center py-4">{t('farm.crop.noObservations')}</p> : (
          observations?.slice(0, 5).map(ob => (
            <div key={ob.id} className="border-b py-2 text-sm">
              <span className="text-muted">{ob.date} · Wk {ob.week}</span>
              <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${
                ob.health === 'Excellent' || ob.health === 'Good' ? 'bg-[#EAF4ED] text-[#2B6B42]' : 'bg-cream-dark text-earth'
              }`}>{ob.health}</span>
              {ob.pest !== 'No' && <span className="ml-2 text-red-600 text-xs">Pest: {ob.pest}</span>}
              {ob.note && <p className="mt-1">{ob.note}</p>}
            </div>
          ))
        )}

        {showObsModal && (
          <Modal onClose={() => setShowObsModal(false)}>
            <form onSubmit={(e) => { e.preventDefault(); addObservation.mutate({ ...obsForm, week: weeks }); setShowObsModal(false); }} className="space-y-3">
              <h3 className="text-xl font-display">{t('farm.crop.logObservation')}</h3>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted block">{t('common.date')}</label>
                <input type="date" value={obsForm.date} onChange={e => setObsForm({...obsForm, date: e.target.value})} className="border p-2 rounded-sm w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted block">{t('farm.crop.health')}</label>
                  <select value={obsForm.health} onChange={e => setObsForm({...obsForm, health: e.target.value})} className="border p-2 rounded-sm w-full">
                    {['Excellent','Good','Fair','Poor'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted block">{t('farm.crop.pest')}</label>
                  <select value={obsForm.pest} onChange={e => setObsForm({...obsForm, pest: e.target.value})} className="border p-2 rounded-sm w-full">
                    <option>No</option><option>Yes - minor</option><option>Yes - serious</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted block">{t('farm.crop.water')}</label>
                  <select value={obsForm.water} onChange={e => setObsForm({...obsForm, water: e.target.value})} className="border p-2 rounded-sm w-full">
                    <option>Good</option><option>Too dry</option><option>Waterlogged</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted block">{t('farm.crop.growth')}</label>
                  <select value={obsForm.growth} onChange={e => setObsForm({...obsForm, growth: e.target.value})} className="border p-2 rounded-sm w-full">
                    <option>On track</option><option>Faster</option><option>Slower</option><option>No growth</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted block">{t('common.notes')}</label>
                <textarea value={obsForm.note} onChange={e => setObsForm({...obsForm, note: e.target.value})} rows={2} className="border p-2 rounded-sm w-full" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" secondary onClick={() => setShowObsModal(false)}>{t('common.cancel')}</Button>
                <Button type="submit" disabled={addObservation.isPending}>{t('common.save')}</Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
}