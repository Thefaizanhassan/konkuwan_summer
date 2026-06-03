import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const customerApi = {
  list: (params) => apiClient.get('/admin/customers', { params }).then(r => r.data),
  create: (data) => apiClient.post('/admin/customers', data).then(r => r.data),
  update: (id, data) => apiClient.put(`/admin/customers/${id}`, data).then(r => r.data),
  delete: (id) => apiClient.delete(`/admin/customers/${id}`).then(r => r.data),
};

export default function CustomerManagement() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search],
    queryFn: () => customerApi.list({ page, limit: 10, search }),
    keepPreviousData: true,
  });

  const createMutation = useMutation({
    mutationFn: customerApi.create,
    onSuccess: () => { queryClient.invalidateQueries(['customers']); setModalOpen(false); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => customerApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['customers']); setModalOpen(false); setEditingCustomer(null); },
  });
  const deleteMutation = useMutation({
    mutationFn: customerApi.delete,
    onSuccess: () => queryClient.invalidateQueries(['customers']),
  });

  const columns = [
    { header: 'Company', accessor: 'company_name' },
    { header: 'Contact', accessor: 'contact_person' },
    { header: 'Email', accessor: 'email' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'GSTIN', accessor: 'gstin' },
  ];

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this customer?')) deleteMutation.mutate(id);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-display text-3xl text-forest">Customers</h2>
        <Button onClick={() => { setEditingCustomer(null); setModalOpen(true); }}>Add Customer</Button>
      </div>
      <div className="mb-4">
        <Input
          placeholder="Search by company, contact, email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
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
          isLoading={createMutation.isLoading || updateMutation.isLoading}
        />
      )}
    </div>
  );
}

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
        <h3 className="text-xl font-display">{customer ? 'Edit Customer' : 'New Customer'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted">Company *</label>
            <input name="company_name" value={form.company_name} onChange={handleChange} required className="w-full border p-2 rounded-sm" />
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