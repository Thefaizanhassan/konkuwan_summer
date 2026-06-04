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