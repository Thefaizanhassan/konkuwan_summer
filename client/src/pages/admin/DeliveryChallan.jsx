import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { downloadChallan } from '../../lib/invoice';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
 
async function printChallan(id, setBusy) {
  setBusy?.(true);
  try {
    await downloadChallan(id);
  } catch (err) {
    alert(err?.response?.data?.message || 'Failed to generate challan PDF.');
  } finally {
    setBusy?.(false);
  }
}
 
export default function DeliveryChallan() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
 
  const { data, isLoading } = useQuery({
    queryKey: ['challans', page, search],
    queryFn: () => apiClient.get('/admin/challans', { params: { page, limit: 20, search } }).then(r => r.data),
    keepPreviousData: true,
  });
 
  const deleteChallan = useMutation({
    mutationFn: (id) => apiClient.delete(`/admin/challans/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['challans'] }),
  });
 
  const columns = [
    { header: t('challans.challanNumber'), accessor: 'challan_number' },
    { header: t('common.date'), accessor: 'challan_date', render: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
    {
      header: t('challans.challanType'),
      accessor: 'challan_type',
      render: (v) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={v === 'warehouse_transfer'
            ? { background: '#DFEBE1', color: '#24422F' }
            : { background: '#FBEBD0', color: '#7C4A03' }}>
          {v === 'warehouse_transfer' ? t('challans.typeTransfer') : t('challans.typeFarmer')}
        </span>
      ),
    },
    {
      // One column covering both workflows: a procurement shows the farmer,
      // a transfer shows source → destination.
      header: t('challans.fromTo'),
      accessor: 'farmer_name',
      render: (v, row) =>
        row.challan_type === 'warehouse_transfer'
          ? `${row.source_warehouse?.name || '—'} → ${row.destination_warehouse?.name || '—'}`
          : `${row.farmer?.name || v || '—'}${row.destination_warehouse ? ` → ${row.destination_warehouse.name}` : ''}`,
    },
    { header: t('challans.goodsValue'), accessor: 'goods_value', render: (v) => inr(v) },
    { header: t('challans.charges'), accessor: 'challan_charges', render: (v) => inr(v) },
    { header: t('common.total'), accessor: 'total_value', render: (v) => <span className="font-semibold text-forest">{inr(v)}</span> },
  ];
 
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-display text-3xl text-forest">{t('challans.title')}</h2>
        <Button onClick={() => setCreateOpen(true)}>+ {t('challans.newChallan')}</Button>
      </div>
      <p className="text-sm text-muted mb-6">{t('challans.subtitle')}</p>
 
      <div className="mb-4">
        <Input placeholder={t('challans.searchPlaceholder')} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>
 
      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        onRowClick={(row) => setViewing(row)}
        actions={(row) => (
          <span className="flex gap-3 justify-end">
            <button onClick={(e) => { e.stopPropagation(); printChallan(row.id); }}
              className="text-sage hover:text-forest text-sm hover:underline">🖨 {t('common.print')}</button>
            <button onClick={(e) => { e.stopPropagation(); if (confirm(t('challans.confirmDelete', { number: row.challan_number }))) deleteChallan.mutate(row.id); }}
              className="text-red-600 text-sm hover:underline">{t('common.delete')}</button>
          </span>
        )}
      />
      <Pagination current={page} total={data?.pagination?.pages || 1} onChange={setPage} />
 
      {createOpen && <CreateChallanModal onClose={() => setCreateOpen(false)}
        onSaved={() => { setCreateOpen(false); queryClient.invalidateQueries({ queryKey: ['challans'] }); }} />}
      {viewing && <ChallanDetail challan={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
 
function ChallanDetail({ challan, onClose }) {
  const { t } = useTranslation();
  const [printing, setPrinting] = useState(false);
  return (
    <Modal onClose={onClose}>
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-display text-2xl text-forest">{challan.challan_number}</h3>
            <p className="text-sm text-muted">{new Date(challan.challan_date).toLocaleDateString('en-IN')}</p>
          </div>
          <Button type="button" secondary onClick={() => printChallan(challan.id, setPrinting)} disabled={printing}>
            {printing ? t('common.generating') : `🖨 ${t('challans.printChallan')}`}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-muted uppercase text-xs">{t('challans.farmer')}</p><p className="font-medium">{challan.farmer?.name || challan.farmer_name || '—'}</p></div>
          {challan.farmer?.village && <div><p className="text-muted uppercase text-xs">{t('challans.village')}</p><p className="font-medium">{challan.farmer.village}</p></div>}
        </div>
        <div className="border border-border rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-cream-dark text-xs text-muted uppercase">
              <tr><th className="px-3 py-2 text-left">{t('common.product')}</th><th className="px-3 py-2 text-right">{t('common.quantity')}</th><th className="px-3 py-2 text-right">{t('common.rate')}</th><th className="px-3 py-2 text-right">{t('common.total')}</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(challan.items || []).map(it => (
                <tr key={it.id}>
                  <td className="px-3 py-2">{it.product?.name || it.product_name || '—'}</td>
                  <td className="px-3 py-2 text-right">{Number(it.quantity)} {it.unit}</td>
                  <td className="px-3 py-2 text-right">{inr(it.purchase_rate)}</td>
                  <td className="px-3 py-2 text-right">{inr(it.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-sm space-y-1 text-right">
          <p><span className="text-muted mr-3">{t('challans.goodsValueLabel')}:</span> {inr(challan.goods_value)}</p>
          <p><span className="text-muted mr-3">{t('challans.chargesLabel')}:</span> {inr(challan.challan_charges)}</p>
          <p className="font-bold text-forest"><span className="mr-3">{t('challans.totalPurchaseValue')}:</span> {inr(challan.total_value)}</p>
        </div>
        {challan.notes && <p className="text-sm bg-cream/50 rounded p-3"><span className="text-muted">{t('common.notes')}: </span>{challan.notes}</p>}
      </div>
    </Modal>
  );
}
 
function CreateChallanModal({ onClose, onSaved }) {
  const { t } = useTranslation();
  const { data: farmers } = useQuery({
    queryKey: ['farm-farmers-min'],
    queryFn: () => apiClient.get('/admin/farm/farmers').then(r => r.data.data),
  });
  const { data: products } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => apiClient.get('/products', { params: { limit: 200 } }).then(r => r.data.data),
  });
  // Only active warehouses: a deactivated one must not receive new stock.
  const { data: warehouses } = useQuery({
    queryKey: ['warehouses-active'],
    queryFn: () => apiClient.get('/admin/warehouses', { params: { active: 'true' } }).then(r => r.data.data),
  });

  const [challanType, setChallanType] = useState('farmer_to_warehouse');
  const [sourceWh, setSourceWh] = useState('');
  const [destWh, setDestWh] = useState('');
  // '' = none picked, 'other' = unregistered supplier, else a farmer id.
  const [otherName, setOtherName] = useState('');
  const [otherAddress, setOtherAddress] = useState('');
  const [farmerId, setFarmerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [charges, setCharges] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: '', unit: 'kg', purchase_rate: '' }]);
 
  const setItem = (i, patch) => setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const onProductPick = (i, product_id) => {
    const p = products?.find(x => x.id === product_id);
    setItem(i, { product_id, unit: p?.unit || 'kg' });
  };
 
  const isTransfer = challanType === 'warehouse_transfer';
  const isOther = farmerId === 'other';
  const selectedFarmer = farmers?.find(f => f.id === farmerId);
  // Farmers enrolled before the address column existed fall back to their
  // village and block, which is what the server does too.
  const farmerAddress = selectedFarmer
    ? (selectedFarmer.address || [selectedFarmer.village, selectedFarmer.block].filter(Boolean).join(', '))
    : '';
 
  const goods = items.reduce((s, it) => s + (parseFloat(it.quantity) || 0) * (parseFloat(it.purchase_rate) || 0), 0);
  const total = goods + (parseFloat(charges) || 0);
  const itemsValid = items.every(it => it.product_id && parseFloat(it.quantity) > 0 && parseFloat(it.purchase_rate) >= 0);
  const partiesValid = isTransfer
    ? Boolean(sourceWh && destWh && sourceWh !== destWh)
    : Boolean((farmerId && !isOther) || (isOther && otherName.trim()));
  const canSubmit = itemsValid && partiesValid;
 
  const save = useMutation({
    mutationFn: () => apiClient.post('/admin/challans', {
      challan_type: challanType,
      challan_date: date,
      // "Other" stores the name and address on the challan alone — deliberately
      // no farmer record is created.
      farmer_id: isTransfer || isOther ? null : farmerId || null,
      farmer_name: isTransfer ? null : (isOther ? otherName.trim() : null),
      farmer_address: isTransfer ? null : (isOther ? otherAddress.trim() || null : farmerAddress || null),
      source_warehouse_id: isTransfer ? sourceWh : null,
      destination_warehouse_id: destWh || null,
      challan_charges: parseFloat(charges) || 0,
      notes: notes || null,
      items: items.map(it => ({
        product_id: it.product_id || null,
        product_name: products?.find(p => p.id === it.product_id)?.name || null,
        quantity: parseFloat(it.quantity),
        unit: it.unit,
        purchase_rate: parseFloat(it.purchase_rate),
      })),
    }),
    onSuccess: onSaved,
    onError: (err) => alert(err?.response?.data?.message || t('challans.createFailed')),
  });
 
  return (
    <Modal onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
        <h3 className="font-display text-xl text-forest">{t('challans.newChallan')}</h3>
 
        {/* Challan type — decides which fields below apply */}
        <div>
          <label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('challans.challanType')}</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { id: 'farmer_to_warehouse', label: t('challans.typeFarmer'), help: t('challans.typeFarmerHelp'), icon: '🌾' },
              { id: 'warehouse_transfer', label: t('challans.typeTransfer'), help: t('challans.typeTransferHelp'), icon: '🏬' },
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setChallanType(opt.id)}
                className="text-left rounded-xl p-3 border-2 transition"
                style={challanType === opt.id
                  ? { borderColor: '#2B5240', background: '#F2F7F2' }
                  : { borderColor: '#D8D0C4', background: '#fff' }}
              >
                <span className="text-sm font-semibold text-forest">{opt.icon} {opt.label}</span>
                <p className="text-[11px] text-muted mt-0.5 leading-snug">{opt.help}</p>
              </button>
            ))}
          </div>
        </div>
 
        {warehouses?.length === 0 && (
          <p className="text-xs rounded-lg p-2" style={{ background: '#FFF8EC', color: '#7C4A03' }}>
            {t('challans.noWarehouses')}
          </p>
        )}
 
        {/* Parties */}
        {isTransfer ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('challans.sourceWarehouse')} *</label>
              <select required value={sourceWh} onChange={e => setSourceWh(e.target.value)}
                className="w-full border border-border rounded-sm px-3 py-2 text-sm">
                <option value="">{t('challans.selectWarehouse')}</option>
                {warehouses?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('challans.destinationWarehouse')} *</label>
              <select required value={destWh} onChange={e => setDestWh(e.target.value)}
                className="w-full border border-border rounded-sm px-3 py-2 text-sm">
                <option value="">{t('challans.selectWarehouse')}</option>
                {warehouses?.filter(w => w.id !== sourceWh).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              {sourceWh && destWh && sourceWh === destWh && (
                <p className="text-xs text-red-600 mt-1">{t('challans.sameWarehouse')}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('challans.farmer')} *</label>
                <select value={farmerId} onChange={e => setFarmerId(e.target.value)}
                  className="w-full border border-border rounded-sm px-3 py-2 text-sm">
                  <option value="">{t('challans.selectFarmer')}</option>
                  {farmers?.map(f => <option key={f.id} value={f.id}>{f.name}{f.village ? ` · ${f.village}` : ''}</option>)}
                  <option value="other">{t('challans.otherFarmer')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('challans.destinationWarehouse')}</label>
                <select value={destWh} onChange={e => setDestWh(e.target.value)}
                  className="w-full border border-border rounded-sm px-3 py-2 text-sm">
                  <option value="">{t('challans.selectWarehouse')}</option>
                  {warehouses?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            </div>
 
            {isOther ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl p-3" style={{ background: '#F4EFE6' }}>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('challans.farmerName')} *</label>
                  <Input required value={otherName} onChange={e => setOtherName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('challans.farmerAddress')}</label>
                  <Input value={otherAddress} onChange={e => setOtherAddress(e.target.value)} />
                </div>
                <p className="sm:col-span-2 text-[11px] text-muted">{t('challans.otherFarmerHint')}</p>
              </div>
            ) : farmerId && (
              <div className="rounded-xl p-3 text-sm" style={{ background: '#F4EFE6' }}>
                <span className="text-xs uppercase tracking-wide text-muted">{t('challans.farmerAddress')}</span>
                <p className="mt-0.5">{farmerAddress || '—'}</p>
              </div>
            )}
          </div>
        )}
 
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">
              {isTransfer ? t('challans.transferDate') : t('common.date')}
            </label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>
 
        <div>
          <label className="block text-xs uppercase tracking-wide text-muted mb-1">
            {isTransfer ? t('challans.productsTransferred') : t('challans.productsPurchased')} *
          </label>
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 mb-2 items-center">
              <select required value={it.product_id} onChange={e => onProductPick(i, e.target.value)}
                className="border border-border rounded-sm px-2 py-2 text-sm">
                <option value="">{t('challans.cropProduct')}</option>
                {products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <Input required type="number" min="0.01" step="any" placeholder={`Qty (${it.unit})`}
                value={it.quantity} onChange={e => setItem(i, { quantity: e.target.value })} />
              <Input required type="number" min="0" step="any" placeholder={t('challans.purchaseRate')}
                value={it.purchase_rate} onChange={e => setItem(i, { purchase_rate: e.target.value })} />
              <button type="button" onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                disabled={items.length === 1} className="text-red-500 text-lg disabled:opacity-30">×</button>
            </div>
          ))}
          <button type="button" onClick={() => setItems([...items, { product_id: '', quantity: '', unit: 'kg', purchase_rate: '' }])}
            className="text-sm text-sage hover:text-forest">+ {t('challans.addProduct')}</button>
        </div>
 
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('challans.challanCharges')}</label>
            <Input type="number" min="0" step="any" placeholder={t('challans.chargesPlaceholder')} value={charges} onChange={e => setCharges(e.target.value)} />
            <p className="text-[11px] text-muted mt-1">
              {isTransfer ? t('challans.typeTransferHelp') : t('challans.chargesHelp')}
            </p>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('common.notes')}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full border border-border rounded-sm px-3 py-2 text-sm" />
          </div>
        </div>
 
        <div className="flex justify-between items-center pt-2 border-t border-border">
          <div className="text-sm">
            <span className="text-muted">{t('challans.goods')}: <strong>{inr(goods)}</strong></span>
            <span className="text-muted ml-4">{t('challans.totalPurchaseValue')}: <strong className="text-forest">{inr(total)}</strong></span>
          </div>
          <div className="flex gap-3">
            <Button type="button" secondary onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={!canSubmit || save.isPending}>{save.isPending ? t('common.saving') : t('challans.createChallan')}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}