import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/api';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
 
const STATUS_COLORS = {
  delivered: 'bg-green-100 text-green-700',
  confirmed: 'bg-blue-100 text-blue-700',
  dispatched: 'bg-amber-100 text-amber-800',
  draft: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
};
 
export default function CustomerProfile() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
 
  const { data, isLoading, error } = useQuery({
    queryKey: ['customer-profile', id],
    queryFn: () => apiClient.get(`/admin/customers/${id}/profile`).then(r => r.data.data),
  });
 
  if (isLoading) return <p className="text-muted">{t('common.loading')}</p>;
  if (error) return <p className="text-red-600">{t('customers.profile.notFound')} <Link to="/admin/customers" className="underline">{t('customers.profile.backToList')}</Link></p>;
  
  const { customer, summary, products, orders } = data;
  const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
 
  return (
    <div className="max-w-5xl">
      <button onClick={() => navigate('/admin/customers')} className="text-sm text-sage hover:text-forest mb-4">← {t('customers.profile.backToList')}</button>
 
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-border p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-display text-3xl text-forest">{customer.company_name}</h2>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                customer.lead_status === 'potential_lead' ? 'bg-[#FBF3E4] text-earth' : 'bg-[#EAF4ED] text-forest'
              }`}>
                {customer.lead_status === 'potential_lead' ? t('customers.potentialLead') : t('customers.activeCustomer')}
              </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-10 gap-y-1 mt-4 text-sm">
              {customer.contact_person && <p><span className="text-muted">{t('customers.contact')}:</span> {customer.contact_person}</p>}
              {customer.email && <p><span className="text-muted">{t('common.email')}:</span> <a href={`mailto:${customer.email}`} className="text-forest underline">{customer.email}</a></p>}
              {customer.phone && <p><span className="text-muted">{t('common.phone')}:</span> {customer.phone}</p>}
              {customer.gstin && <p><span className="text-muted">{t('customers.gstin')}:</span> {customer.gstin}</p>}
              {customer.address && <p className="sm:col-span-2"><span className="text-muted">{t('common.address')}:</span> {customer.address}</p>}
              {customer.linkedin_url && <p className="sm:col-span-2"><a href={customer.linkedin_url} target="_blank" rel="noreferrer" className="text-sage hover:text-forest">{t('customers.linkedin')} ↗</a></p>}
              {customer.notes && <p className="sm:col-span-2"><span className="text-muted">{t('common.notes')}:</span> {customer.notes}</p>}
            </div>
          </div>
          <Button onClick={() => setEditing(true)}>✎ {t('customers.editCustomer')}</Button>
        </div>
      </div>
 
      {/* Purchase summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <SummaryCard label={t('customers.profile.totalPurchased')} value={inr(summary.total_purchased)} accent />
        <SummaryCard label={t('customers.profile.orders')} value={summary.total_orders} sub={t('customers.profile.ordersCompleted', { count: summary.billable_orders })} />
        <SummaryCard label={t('customers.profile.firstOrder')} value={summary.first_order_date ? new Date(summary.first_order_date).toLocaleDateString('en-IN') : '—'} />
        <SummaryCard label={t('customers.profile.lastOrder')} value={summary.last_order_date ? new Date(summary.last_order_date).toLocaleDateString('en-IN') : '—'} />
      </div>
 
      {/* Products / crops purchased */}
      <div className="bg-white rounded-2xl border border-border p-6 mb-6">
        <h3 className="font-display text-lg text-forest mb-3">{t('customers.profile.productsPurchased')}</h3>
        {products.length === 0 ? (
          <p className="text-sm text-muted">{t('customers.profile.noProducts')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted border-b border-border">
              <tr><th className="text-left py-2">{t('common.product')}</th><th className="text-right py-2">{t('customers.profile.totalQuantity')}</th><th className="text-right py-2">{t('customers.profile.totalSpend')}</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p, i) => (
                <tr key={i}>
                  <td className="py-2">{p.product}</td>
                  <td className="py-2 text-right font-mono">{Number(p.quantity).toLocaleString('en-IN')} {p.unit}</td>
                  <td className="py-2 text-right font-mono">{inr(p.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
 
      {/* Order history / purchase timeline */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <h3 className="font-display text-lg text-forest mb-3">{t('customers.profile.orderHistory')}</h3>
        {orders.length === 0 ? (
          <p className="text-sm text-muted">{t('customers.profile.noOrders')}</p>
        ) : (
          <div className="relative pl-6">
            <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
            {orders.map(o => (
              <div key={o.id} className="relative pb-5 last:pb-0">
                <span className="absolute -left-[18px] top-1 w-3 h-3 rounded-full bg-forest border-2 border-white" />
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="font-medium">{new Date(o.order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[o.status] || ''}`}>{o.status}</span>
                    {o.invoice_number && <span className="ml-2 text-xs text-muted">Inv: {o.invoice_number}</span>}
                    {o.quotation_number && <span className="ml-2 text-xs text-muted">Quo: {o.quotation_number}</span>}
                  </div>
                  <span className="font-mono font-semibold text-forest">{inr(o.total_amount)}</span>
                </div>
                <p className="text-xs text-muted mt-1">
                  {(o.items || []).map(it => `${it.product?.name || '—'} × ${Number(it.quantity)}${it.unit || ''}`).join(' · ')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
 
      {editing && (
        <EditCustomerModal
          customer={customer}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); queryClient.invalidateQueries({ queryKey: ['customer-profile', id] }); queryClient.invalidateQueries({ queryKey: ['customers'] }); }}
        />
      )}
    </div>
  );
}
 
function SummaryCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-4">
      <p className="text-xs text-muted uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 ${accent ? 'text-forest' : ''}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted mt-0.5">{sub}</p>}
    </div>
  );
}
 
function EditCustomerModal({ customer, onClose, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    company_name: customer.company_name || '', contact_person: customer.contact_person || '',
    email: customer.email || '', phone: customer.phone || '', address: customer.address || '',
    gstin: customer.gstin || '', notes: customer.notes || '',
    lead_status: customer.lead_status || 'potential_lead', linkedin_url: customer.linkedin_url || '',
  });
  const save = useMutation({
    mutationFn: () => apiClient.put(`/admin/customers/${customer.id}`, form),
    onSuccess: onSaved,
    onError: (err) => alert(err?.response?.data?.message || t('common.somethingWentWrong')),
  });
  const field = 'w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20';
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  return (
    <Modal onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
        <h3 className="font-display text-xl text-forest">{t('customers.editCustomer')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('customers.company')} *</label><input name="company_name" value={form.company_name} onChange={set} required className={field} /></div>
          <div><label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('customers.contactPerson')}</label><input name="contact_person" value={form.contact_person} onChange={set} className={field} /></div>
          <div><label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('common.email')}</label><input name="email" type="email" value={form.email} onChange={set} className={field} /></div>
          <div><label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('common.phone')}</label><input name="phone" value={form.phone} onChange={set} className={field} /></div>
          <div className="col-span-2"><label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('common.address')}</label><textarea name="address" value={form.address} onChange={set} rows={2} className={field} /></div>
          <div><label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('customers.gstin')}</label><input name="gstin" value={form.gstin} onChange={set} className={field} /></div>
          <div><label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('customers.leadStatus')}</label>
            <select name="lead_status" value={form.lead_status} onChange={set} className={field}>
              <option value="active_customer">{t('customers.activeCustomer')}</option>
              <option value="potential_lead">{t('customers.potentialLead')}</option>
            </select>
          </div>
          <div className="col-span-2"><label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('customers.linkedinUrl')}</label><input name="linkedin_url" value={form.linkedin_url} onChange={set} className={field} /></div>
          <div className="col-span-2"><label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('common.notes')}</label><textarea name="notes" value={form.notes} onChange={set} rows={2} className={field} /></div>
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" secondary onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={save.isPending}>{save.isPending ? t('common.saving') : t('common.save')}</Button>
        </div>
      </form>
    </Modal>
  );
}