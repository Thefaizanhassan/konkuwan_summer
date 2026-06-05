import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';

export default function ProductManagement() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page],
    queryFn: () =>
      apiClient.get('/products', { params: { page, limit: 10 } }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d) => apiClient.post('/admin/products', d).then(r => r.data),
    onSuccess: () => { queryClient.invalidateQueries(['admin-products']); handleClose(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }) => apiClient.put(`/admin/products/${id}`, d).then(r => r.data),
    onSuccess: () => { queryClient.invalidateQueries(['admin-products']); handleClose(); },
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/admin/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['admin-products']),
  });

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Botanical', accessor: 'botanical_name' },
    {
      header: 'Price Range',
      accessor: 'price_min',
      render: (_, row) =>
        row.price_min != null
          ? `₹${row.price_min} – ₹${row.price_max} / ${row.unit}`
          : 'On inquiry',
    },
    {
      header: 'Active',
      accessor: 'is_active',
      render: (val) => val
        ? <span className="text-green-600 text-xs font-medium">Active</span>
        : <span className="text-red-500 text-xs font-medium">Archived</span>,
    },
  ];

  const handleEdit = (product) => { setEditingProduct(product); setModalOpen(true); };
  const handleClose = () => { setModalOpen(false); setEditingProduct(null); };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-display text-3xl text-forest">Products</h2>
        <Button onClick={() => setModalOpen(true)}>+ Add Product</Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        onRowClick={handleEdit}
        isLoading={isLoading}
        actions={(row) => (
          <button
            onClick={(e) => { e.stopPropagation(); if (window.confirm('Archive this product?')) archiveMutation.mutate(row.id); }}
            className="text-red-600 text-sm hover:underline"
          >
            Archive
          </button>
        )}
      />

      <Pagination current={page} total={data?.pagination?.pages} onChange={setPage} />

      {modalOpen && (
        <ProductFormModal
          product={editingProduct}
          onClose={handleClose}
          onSubmit={(formData) => {
            if (editingProduct) {
              updateMutation.mutate({ id: editingProduct.id, ...formData });
            } else {
              createMutation.mutate(formData);
            }
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}

function ProductFormModal({ product, onClose, onSubmit, isLoading }) {
  const [form, setForm] = useState({
    name: product?.name || '',
    botanical_name: product?.botanical_name || '',
    description: product?.description || '',
    forms: product?.forms || '',
    price_min: product?.price_min || '',
    price_max: product?.price_max || '',
    unit: product?.unit || 'kg',
    is_active: product?.is_active ?? true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      price_min: form.price_min !== '' ? parseFloat(form.price_min) : null,
      price_max: form.price_max !== '' ? parseFloat(form.price_max) : null,
    });
  };

  return (
    <Modal onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="font-display text-xl text-forest">
          {product ? 'Edit Product' : 'New Product'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">Name *</label>
            <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">Botanical Name</label>
            <Input value={form.botanical_name} onChange={e => setForm({ ...form, botanical_name: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full border border-border rounded-sm px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">Forms</label>
            <Input placeholder="e.g. Dried · Powder" value={form.forms} onChange={e => setForm({ ...form, forms: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">Unit</label>
            <select
              value={form.unit}
              onChange={e => setForm({ ...form, unit: e.target.value })}
              className="w-full border border-border rounded-sm px-3 py-2 text-sm"
            >
              {['kg', 'MT', 'ton', 'g', 'litre'].map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">Price Min (₹)</label>
            <Input type="number" placeholder="Leave blank for 'On inquiry'" value={form.price_min} onChange={e => setForm({ ...form, price_min: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">Price Max (₹)</label>
            <Input type="number" value={form.price_max} onChange={e => setForm({ ...form, price_max: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
            <label htmlFor="active" className="text-sm">Active / visible on site</label>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" secondary onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Product'}</Button>
        </div>
      </form>
    </Modal>
  );
}

/* #initial code
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';

export default function ProductManagement() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page],
    queryFn: () => apiClient.get('/admin/products', { params: { page, limit: 10 } }).then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/admin/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['admin-products']),
  });

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Botanical', accessor: 'botanical_name' },
    { header: 'Price Range', render: (row) => row.price_min ? `₹${row.price_min} - ₹${row.price_max}` : 'On inquiry' },
    { header: 'Active', accessor: 'is_active', render: (val) => val ? '✅' : '❌' },
  ];

  const handleEdit = (product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
    setEditingProduct(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-display text-3xl text-forest">Products</h2>
        <Button onClick={() => setModalOpen(true)}>Add Product</Button>
      </div>
      <DataTable
        columns={columns}
        data={data?.data || []}
        onRowClick={handleEdit}
        isLoading={isLoading}
        actions={(row) => (
          <button onClick={() => deleteMutation.mutate(row.id)} className="text-red-600 text-sm">Archive</button>
        )}
      />
      <Pagination current={page} total={data?.pagination?.pages} onChange={setPage} />
      {modalOpen && (
        <ProductFormModal
          product={editingProduct}
          onClose={handleClose}
          onSuccess={() => { queryClient.invalidateQueries(['admin-products']); handleClose(); }}
        />
      )}
    </div>
  );
}

// ProductFormModal would include fields: name, botanical_name, description, forms, price_min, price_max, unit, category_ids (multi-select), image upload component.
// It uses react-hook-form and calls POST /api/admin/products or PUT /api/admin/products/:id.
// Image upload uses a separate dropzone and calls POST /api/admin/products/:id/images after product creation.
*/