import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
 
export default function WarehouseManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null); // null = closed, {} = new
  const [modalOpen, setModalOpen] = useState(false);
 
  const { data, isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => apiClient.get('/admin/warehouses').then((r) => r.data.data),
  });
 
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['warehouses'] });
 
  const deactivate = useMutation({
    mutationFn: (id) => apiClient.patch(`/admin/warehouses/${id}/deactivate`),
    onSuccess: refresh,
    onError: (err) => alert(err?.response?.data?.message || t('common.somethingWentWrong')),
  });
 
  const remove = useMutation({
    mutationFn: (id) => apiClient.delete(`/admin/warehouses/${id}`),
    onSuccess: refresh,
    // A warehouse with challans returns 409 explaining to deactivate instead.
    onError: (err) => alert(err?.response?.data?.message || t('common.somethingWentWrong')),
  });
 
  const columns = [
    { header: t('warehouses.name'), accessor: 'name' },
    { header: t('warehouses.code'), accessor: 'code', render: (v) => v || '—' },
    {
      header: t('warehouses.location'),
      accessor: 'city',
      render: (_, row) => [row.city, row.state].filter(Boolean).join(', ') || '—',
    },
    { header: t('warehouses.contactPerson'), accessor: 'contact_person', render: (v) => v || '—' },
    {
      header: t('common.status'),
      accessor: 'is_active',
      render: (v) =>
        v ? (
          <span className="text-green-600 font-medium">{t('warehouses.active')}</span>
        ) : (
          <span className="text-red-500 font-medium">{t('warehouses.inactive')}</span>
        ),
    },
  ];
 
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-display text-3xl text-forest">{t('warehouses.title')}</h2>
        <Button onClick={() => { setEditing({}); setModalOpen(true); }}>
          + {t('warehouses.addWarehouse')}
        </Button>
      </div>
 
      <DataTable
        columns={columns}
        data={data || []}
        isLoading={isLoading}
        onRowClick={(row) => { setEditing(row); setModalOpen(true); }}
        actions={(row) => (
          <div className="flex gap-3">
            {row.is_active && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(t('warehouses.confirmDeactivate', { name: row.name })))
                    deactivate.mutate(row.id);
                }}
                className="text-orange-600 text-sm hover:underline"
              >
                {t('warehouses.deactivate')}
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(t('warehouses.confirmDelete', { name: row.name })))
                  remove.mutate(row.id);
              }}
              className="text-red-600 text-sm hover:underline"
            >
              {t('common.delete')}
            </button>
          </div>
        )}
      />
 
      {!isLoading && (data || []).length === 0 && (
        <p className="text-sm text-muted text-center py-8">{t('warehouses.none')}</p>
      )}
 
      {modalOpen && (
        <WarehouseModal
          warehouse={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSaved={() => { setModalOpen(false); setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}
 
function WarehouseModal({ warehouse, onClose, onSaved }) {
  const { t } = useTranslation();
  const isNew = !warehouse?.id;
  const [form, setForm] = useState({
    name: warehouse?.name || '',
    code: warehouse?.code || '',
    address: warehouse?.address || '',
    city: warehouse?.city || '',
    state: warehouse?.state || '',
    pincode: warehouse?.pincode || '',
    contact_person: warehouse?.contact_person || '',
    phone: warehouse?.phone || '',
    notes: warehouse?.notes || '',
    is_active: warehouse?.is_active ?? true,
  });
 
  const save = useMutation({
    mutationFn: () =>
      isNew
        ? apiClient.post('/admin/warehouses', form)
        : apiClient.put(`/admin/warehouses/${warehouse.id}`, form),
    onSuccess: onSaved,
    onError: (err) => alert(err?.response?.data?.message || t('warehouses.saveFailed')),
  });
 
  const field =
    'w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20';
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const Label = ({ children }) => (
    <label className="block text-xs uppercase tracking-wide text-muted mb-1">{children}</label>
  );
 
  return (
    <Modal onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
        <h3 className="font-display text-xl text-forest">
          {isNew ? t('warehouses.addWarehouse') : t('warehouses.editWarehouse')}
        </h3>
 
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>{t('warehouses.name')} *</Label>
            <input name="name" value={form.name} onChange={set} required className={field} />
          </div>
          <div>
            <Label>{t('warehouses.code')}</Label>
            <input name="code" value={form.code} onChange={set} className={field} />
          </div>
          <div>
            <Label>{t('warehouses.contactPerson')}</Label>
            <input name="contact_person" value={form.contact_person} onChange={set} className={field} />
          </div>
          <div className="md:col-span-2">
            <Label>{t('warehouses.address')}</Label>
            <textarea name="address" value={form.address} onChange={set} rows={2} className={field} />
          </div>
          <div>
            <Label>{t('warehouses.city')}</Label>
            <input name="city" value={form.city} onChange={set} className={field} />
          </div>
          <div>
            <Label>{t('warehouses.state')}</Label>
            <input name="state" value={form.state} onChange={set} className={field} />
          </div>
          <div>
            <Label>{t('warehouses.pincode')}</Label>
            <input name="pincode" value={form.pincode} onChange={set} className={field} />
          </div>
          <div>
            <Label>{t('common.phone')}</Label>
            <input name="phone" value={form.phone} onChange={set} className={field} />
          </div>
          <div className="md:col-span-2">
            <Label>{t('common.notes')}</Label>
            <textarea name="notes" value={form.notes} onChange={set} rows={2} className={field} />
          </div>
        </div>
 
        {!isNew && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="wh_active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            <label htmlFor="wh_active" className="text-sm">
              {t('warehouses.active')}
              <span className="text-xs text-muted ml-2">{t('warehouses.inactiveHint')}</span>
            </label>
          </div>
        )}
 
        <div className="flex justify-end gap-3">
          <Button type="button" secondary onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}