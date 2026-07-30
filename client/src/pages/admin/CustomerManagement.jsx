import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Papa from 'papaparse';

const customerApi = {
  list: (params) => apiClient.get('/admin/customers', { params }).then(r => r.data),
  create: (data) => apiClient.post('/admin/customers', data).then(r => r.data),
  update: (id, data) => apiClient.put(`/admin/customers/${id}`, data).then(r => r.data),
  delete: (id) => apiClient.delete(`/admin/customers/${id}`).then(r => r.data),
};

export default function CustomerManagement() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [leadFilter, setLeadFilter] = useState('');
  const [exporting, setExporting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search, leadFilter],
    queryFn: () => customerApi.list({ page, limit: 20, search, lead_status: leadFilter || undefined }),
    keepPreviousData: true,
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: res } = await apiClient.get('/admin/customers/export');
      const rows = res.data || [];
      if (!rows.length) return alert('No customers to export.');
      const csv = Papa.unparse(rows.map(r => ({
        ...r,
        created_at: r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '',
      })));
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `konkuwan-customers-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err?.response?.data?.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };
 
  const createMutation = useMutation({
    mutationFn: customerApi.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); setModalOpen(false); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => customerApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); setModalOpen(false); setEditingCustomer(null); },
  });
  const deleteMutation = useMutation({
    mutationFn: customerApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
    // Without this the delete failed silently (e.g. customer has orders —
    // the DB blocks the delete). Now the reason is shown.
    onError: (err) => alert(err?.response?.data?.message || 'Failed to delete customer.'),
  });

  const columns = [
    { header: 'Company', accessor: 'company_name' },
    { header: 'Contact', accessor: 'contact_person' },
    { header: 'Email', accessor: 'email' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'GSTIN', accessor: 'gstin' },
    {
      header: 'Total Purchase',
      accessor: 'total_purchased',
      render: (val) => (
        <span className={Number(val) > 0 ? 'font-semibold text-forest font-mono' : 'text-muted font-mono'}>
          ₹{Number(val || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Lead Status',
      accessor: 'lead_status',
      render: (val) => (
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
          val === 'potential_lead' ? 'bg-[#FBF3E4] text-earth' : 'bg-[#EAF4ED] text-forest'
        }`}>
          {val === 'potential_lead' ? 'Potential Lead' : 'Active Customer'}
        </span>
      ),
    },
    {
      header: 'LinkedIn',
      accessor: 'linkedin_url',
      render: (val) => val
        ? <a href={val} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
             className="text-sage hover:text-forest text-sm">Profile ↗</a>
        : <span className="text-muted text-sm">—</span>,
    },
  ];

  // Clicking a row opens the full customer profile (detailed account page)
  const handleEdit = (customer) => {
    navigate(`/admin/customers/${customer.id}`);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this customer?')) deleteMutation.mutate(id);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-display text-3xl text-forest">Customers</h2>
        {/* <Button onClick={() => { setEditingCustomer(null); setModalOpen(true); }}>Add Customer</Button> */}
        <div className="flex gap-3">
          <Button secondary onClick={handleExport} disabled={exporting}>{exporting ? 'Exporting…' : '⬇ Export CSV'}</Button>
          <Button secondary onClick={() => setImportOpen(true)}>⬆ Import CSV</Button>
          <Button onClick={() => { setEditingCustomer(null); setModalOpen(true); }}>Add Customer</Button>
        </div>
      </div>
      <div className="mb-4 flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <Input
            placeholder="Search by company, contact, email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          value={leadFilter}
          onChange={(e) => { setLeadFilter(e.target.value); setPage(1); }}
          className="border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20"
        >
          <option value="">All Customers</option>
          <option value="active_customer">Active Customers</option>
          <option value="potential_lead">Potential Leads</option>
        </select>
      </div>
      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        onRowClick={handleEdit}
        actions={(row) => (
          <button onClick={() => handleDelete(row.id)} className="text-red-600 text-sm hover:underline">Delete</button>
        )}
      />
      <Pagination current={page} total={data?.pagination?.pages} onChange={setPage} />

      {modalOpen && (
        <CustomerFormModal
          customer={editingCustomer}
          onClose={() => { setModalOpen(false); setEditingCustomer(null); }}
          onSubmit={(data) => {
            if (editingCustomer) updateMutation.mutate({ id: editingCustomer.id, ...data });
            else createMutation.mutate(data);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {importOpen && (
        <ImportCustomersModal
          onClose={() => setImportOpen(false)}
          onDone={() => queryClient.invalidateQueries({ queryKey: ['customers'] })}
        />
      )}
    </div>
  );
}

function CustomerFormModal({ customer, onClose, onSubmit, isLoading }) {
  // Only editable fields — never send id/created_at/updated_at back to the API
  const [form, setForm] = useState({
    company_name: customer?.company_name || '',
    contact_person: customer?.contact_person || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    gstin: customer?.gstin || '',
    notes: customer?.notes || '',
    lead_status: customer?.lead_status || 'potential_lead',
    linkedin_url: customer?.linkedin_url || '',
  });

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = e => { e.preventDefault(); onSubmit(form); };

  const field = 'w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20';

  return (
    <Modal onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="font-display text-xl text-forest">{customer ? 'Edit Customer' : 'New Customer'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">Company *</label>
            <input name="company_name" value={form.company_name} onChange={handleChange} required className={field} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">Contact Person</label>
            <input name="contact_person" value={form.contact_person} onChange={handleChange} className={field} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} className={field} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange} className={field} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">Address</label>
            <textarea name="address" value={form.address} onChange={handleChange} className={field} rows={2} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">GSTIN</label>
            <input name="gstin" value={form.gstin} onChange={handleChange} className={field} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">Status of Lead</label>
            <select name="lead_status" value={form.lead_status || 'active_customer'} onChange={handleChange} className={field}>
              <option value="active_customer">Active Customer</option>
              <option value="potential_lead">Potential Lead</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">LinkedIn Profile URL</label>
            <input name="linkedin_url" type="url" placeholder="https://linkedin.com/company/…"
              value={form.linkedin_url || ''} onChange={handleChange} className={field} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} className={field} rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" secondary onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ImportCustomersModal({ onClose, onDone }) {
  const [rows, setRows] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);

  // Accepted headers (case-insensitive): company_name, contact_person, email,
  // phone, address, gstin, notes, lead_status, linkedin_url
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: ({ data, errors }) => {
        setParseErrors(errors.map(er => `Row ${er.row + 1}: ${er.message}`));
        setRows(data.filter(r => Object.values(r).some(v => String(v || '').trim() !== '')));
        setSummary(null);
      },
    });
  };

  const runImport = async () => {
    setBusy(true);
    try {
      const payload = rows.map(r => ({
        company_name: r.company_name?.trim(),
        contact_person: r.contact_person || null,
        email: r.email || null,
        phone: r.phone || null,
        address: r.address || null,
        gstin: r.gstin || null,
        notes: r.notes || null,
        lead_status: ['active_customer', 'potential_lead'].includes(r.lead_status) ? r.lead_status : 'potential_lead',
        linkedin_url: r.linkedin_url || null,
      }));
      const { data } = await apiClient.post('/admin/customers/import', { customers: payload });
      setSummary(data.data);
      onDone();
    } catch (err) {
      setSummary({ imported: 0, skipped: rows.length, errors: [{ row: '—', reason: err?.response?.data?.message || 'Import failed' }] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="space-y-4">
        <h3 className="font-display text-xl text-forest">Import Customers (CSV)</h3>
        <p className="text-xs text-muted">
          Required column: <code>company_name</code>. Optional: contact_person, email, phone, address,
          gstin, notes, lead_status (active_customer / potential_lead), linkedin_url.
        </p>
        <input type="file" accept=".csv,text/csv" onChange={handleFile}
          className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-sm file:border-0 file:bg-forest file:text-white" />

        {parseErrors.length > 0 && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-sm p-2 max-h-24 overflow-auto">
            {parseErrors.map((e, i) => <div key={i}>{e}</div>)}
          </div>
        )}

        {rows.length > 0 && !summary && (
          <p className="text-sm">Parsed <strong>{rows.length}</strong> rows. Duplicates (same company or email) will be skipped.</p>
        )}

        {summary && (
          <div className="text-sm bg-cream rounded-sm p-3 space-y-1">
            <p>✅ Imported: <strong>{summary.imported}</strong></p>
            <p>⏭ Skipped: <strong>{summary.skipped}</strong></p>
            {summary.errors?.length > 0 && (
              <div className="max-h-32 overflow-auto text-xs text-muted mt-2">
                {summary.errors.map((e, i) => <div key={i}>Row {e.row} ({e.company || '—'}): {e.reason}</div>)}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" secondary onClick={onClose}>{summary ? 'Close' : 'Cancel'}</Button>
          {!summary && <Button onClick={runImport} disabled={!rows.length || busy}>{busy ? 'Importing…' : `Import ${rows.length} rows`}</Button>}
        </div>
      </div>
    </Modal>
  );
}
/*
function CustomerFormModal({ customer, onClose, onSubmit, isLoading }) {
  const [form, setForm] = useState(customer || { company_name: '', contact_person: '', email: '', phone: '', address: '', gstin: '', notes: '' });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

    return (
        <Modal onClose={onClose}>
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="font-display text-xl text-forest">{customer ? 'Edit Customer' : 'New Customer'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted">Company *</label>
            <input name="company_name" value={form.company_name} onChange={handleChange} required className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted">Contact Person</label>
            <input name="contact_person" value={form.contact_person} onChange={handleChange} className="w-full border p-2 rounded-sm" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted">Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} className="w-full border p-2 rounded-sm" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted">Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange} className="w-full border p-2 rounded-sm" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs uppercase tracking-wide text-muted">Address</label>
            <textarea name="address" value={form.address} onChange={handleChange} className="w-full border p-2 rounded-sm" rows={2} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted">GSTIN</label>
            <input name="gstin" value={form.gstin} onChange={handleChange} className="w-full border p-2 rounded-sm" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs uppercase tracking-wide text-muted">Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} className="w-full border p-2 rounded-sm" rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" secondary onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  );
}
*/