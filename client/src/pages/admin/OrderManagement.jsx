import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import OrderDetail from '../../components/admin/OrderDetail';

const orderApi = {
  list: (params) =>
    apiClient.get('/admin/orders', { params }).then((r) => r.data),

  create: (data) =>
    apiClient.post('/admin/orders', data).then((r) => r.data),
};

export default function OrderManagement() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
  });

  const [selectedOrder, setSelectedOrder] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, filters],
    queryFn: () =>
      orderApi.list({
        page,
        limit: 20,
        ...filters,
      }),
    keepPreviousData: true,
  });

  const setFinalPrice = useMutation({
    mutationFn: ({ orderId, itemId, final_price }) =>
      apiClient.put(
        `/admin/orders/${orderId}/items/${itemId}/final-price`,
        { final_price }
      ),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin-orders'],
      });
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ orderId, status }) =>
      apiClient.put(`/admin/orders/${orderId}/status`, {
        status,
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin-orders'],
      });
    },
  });

  const columns = [
    {
      header: 'Customer',
      accessor: 'Customer',
      render: (_, row) => row.Customer?.company_name || '—',
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      header: 'Total',
      accessor: 'total_amount',
      render: (val) =>
        `₹${Number(val || 0).toLocaleString()}`,
    },
    {
      header: 'Date',
      accessor: 'order_date',
      render: (val) =>
        val ? new Date(val).toLocaleDateString() : '—',
    },
  ];

  const STATUSES = [
    'draft',
    'confirmed',
    'dispatched',
    'delivered',
    'cancelled',
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-display text-3xl text-forest">
          Orders
        </h2>
      </div>

      <div className="mb-4 flex gap-3 flex-wrap">
        <select
          value={filters.status}
          onChange={(e) => {
            setFilters((f) => ({
              ...f,
              status: e.target.value,
            }));
            setPage(1);
          }}
          className="border border-border rounded-sm px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>

          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => {
            setFilters((f) => ({
              ...f,
              startDate: e.target.value,
            }));
            setPage(1);
          }}
          className="border border-border rounded-sm px-3 py-2 text-sm"
        />

        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => {
            setFilters((f) => ({
              ...f,
              endDate: e.target.value,
            }));
            setPage(1);
          }}
          className="border border-border rounded-sm px-3 py-2 text-sm"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        onRowClick={(row) => setSelectedOrder(row)}
      />

      <Pagination
        current={page}
        total={data?.pagination?.pages || 1}
        onChange={setPage}
      />

      {selectedOrder && (
        <OrderDetail
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={(status) =>
            updateStatus.mutate({
              orderId: selectedOrder.id,
              status,
            })
          }
          onSetFinalPrice={(itemId, final_price) =>
            setFinalPrice.mutate({
              orderId: selectedOrder.id,
              itemId,
              final_price,
            })
          }
          statusLoading={updateStatus.isPending}
          priceLoading={setFinalPrice.isPending}
        />
      )}
    </div>
  );
}


// Order list with filters (status, date range)
// useQuery with /api/admin/orders
// Click row opens <OrderDetail> modal with full order info and actions.

// const setFinalPrice = useMutation({
//   mutationFn: ({ orderId, itemId, final_price }) =>
//     apiClient.put(`/api/admin/orders/${orderId}/items/${itemId}/final-price`, { final_price }),
//   onSuccess: () => queryClient.invalidateQueries(['admin-orders']),
// });

// const updateStatus = useMutation({
//   mutationFn: ({ orderId, status }) =>
//     apiClient.put(`/api/admin/orders/${orderId}/status`, { status }),
//   onSuccess: () => queryClient.invalidateQueries(['admin-orders']),
// });

