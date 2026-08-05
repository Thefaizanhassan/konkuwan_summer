import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import OrderDetail from '../../components/admin/OrderDetail';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const orderApi = {
  list: (params) =>
    apiClient.get('/admin/orders', { params }).then((r) => r.data),

  create: (data) =>
    apiClient.post('/admin/orders', data).then((r) => r.data),
};

export default function OrderManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState({
    status: '',
    from_date: '',
    to_date: '',
  });

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

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


  const createOrder = useMutation({
    mutationFn: orderApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setCreateOpen(false);
    },
  });

  const columns = [
    {
      header: t('orders.customer'),
      accessor: 'Customer',
      render: (_, row) => row.Customer?.company_name || '—',
    },
    {
      header: t('common.status'),
      accessor: 'status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      header: t('common.total'),
      accessor: 'total_amount',
      render: (val) =>
        `₹${Number(val || 0).toLocaleString()}`,
    },
    {
      header: t('common.date'),
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
        <h2 className="font-display text-3xl text-forest">{t('orders.title')}</h2>
        <Button onClick={() => setCreateOpen(true)}>+ {t('orders.newOrder')}</Button>
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
          // className="border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20"
        >
          <option value="">{t('orders.allStatuses')}</option>

          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`orders.status.${status}`)}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={filters.from_date}
          onChange={(e) => {
            setFilters((f) => ({
              ...f,
              from_date: e.target.value,
            }));
            setPage(1);
          }}
          className="border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20"
        />

        <input
          type="date"
          value={filters.to_date}
          onChange={(e) => {
            setFilters((f) => ({
              ...f,
              to_date: e.target.value,
            }));
            setPage(1);
          }}
          className="border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20"
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

      {createOpen && (
        <CreateOrderModal
          onClose={() => setCreateOpen(false)}
          onSubmit={(payload) => createOrder.mutate(payload)}
          isLoading={createOrder.isPending}
          error={createOrder.error?.response?.data?.message}
        />
      )}
    </div>
  );
}

function CreateOrderModal({ onClose, onSubmit, isLoading, error }) {
  const { t } = useTranslation();
  const { data: customers } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => apiClient.get('/admin/customers', { params: { limit: 200 } }).then(r => r.data.data),
  });
  const { data: products } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => apiClient.get('/products', { params: { limit: 200 } }).then(r => r.data.data),
  });

  const [customerId, setCustomerId] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState([{ product_id: '', product_name: '', quantity: '', unit: 'kg', unit_price: '' }]);

  const setItem = (i, patch) =>
    setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  // 'other' is a sentinel, not an id: it switches the row to a free-text name.
  const onProductPick = (i, product_id) => {
    if (product_id === 'other') return setItem(i, { product_id: 'other', product_name: '', unit: 'kg' });
    const p = products?.find(x => x.id === product_id);
    setItem(i, {
      product_id,
      unit: p?.unit || 'kg',
      unit_price: p?.price_min != null ? String(p.price_min) : '',
    });
  };

  const total = items.reduce(
    (s, it) => s + (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0), 0
  );

  const itemNamed = (it) => (it.product_id === 'other' ? it.product_name.trim() : it.product_id);
  const canSubmit = customerId && items.every(it => itemNamed(it) && parseFloat(it.quantity) > 0 && parseFloat(it.unit_price) > 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      customer_id: customerId,
      final_note: note || null,
      items: items.map(it => ({
        // A custom line sends a name instead of an id; the server stores it on
        // the line and never touches the product catalogue.
        product_id: it.product_id === 'other' ? null : it.product_id,
        product_name: it.product_id === 'other' ? it.product_name.trim() : null,
        quantity: parseFloat(it.quantity),
        unit: it.unit,
        unit_price: parseFloat(it.unit_price),
      })),
    });
  };

  return (
    <Modal onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="font-display text-xl text-forest">{t('orders.newOrder')}</h3>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">{error}</p>}

        <div>
          <label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('orders.customer')} *</label>
          <select required value={customerId} onChange={e => setCustomerId(e.target.value)}
            className="w-full border border-border rounded-sm px-3 py-2 text-sm">
            <option value="">{t('orders.selectCustomer')}</option>
            {customers?.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('orders.lineItems')} *</label>
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 mb-2 items-center">
              <div>
                <select required value={it.product_id} onChange={e => onProductPick(i, e.target.value)}
                  className="w-full border border-border rounded-sm px-2 py-2 text-sm">
                  <option value="">{t('common.product')}…</option>
                  {products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  <option value="other">{t('orders.otherProduct')}</option>
                </select>
                {it.product_id === 'other' && (
                  <>
                    <Input required className="mt-1" placeholder={t('orders.customProductName')}
                      value={it.product_name} onChange={e => setItem(i, { product_name: e.target.value })} />
                    <p className="text-[11px] text-muted mt-0.5">{t('orders.customProductHint')}</p>
                  </>
                )}
              </div>
              <Input required type="number" min="0.01" step="any" placeholder={`Qty (${it.unit})`}
                value={it.quantity} onChange={e => setItem(i, { quantity: e.target.value })} />
              <Input required type="number" min="0.01" step="any" placeholder={t('orders.unitPrice')}
                value={it.unit_price} onChange={e => setItem(i, { unit_price: e.target.value })} />
              <button type="button" onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                disabled={items.length === 1} className="text-red-500 text-lg disabled:opacity-30">×</button>
            </div>
          ))}
          <button type="button"
            onClick={() => setItems([...items, { product_id: '', product_name: '', quantity: '', unit: 'kg', unit_price: '' }])}
            className="text-sm text-sage hover:text-forest">+ {t('orders.addLine')}</button>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('common.notes')}</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
            className="w-full border border-border rounded-sm px-3 py-2 text-sm" />
        </div>

        <div className="flex justify-between items-center pt-2">
          <span className="text-sm text-muted">{t('orders.estimatedTotal')}: <strong className="text-forest">₹{total.toLocaleString('en-IN')}</strong></span>
          <div className="flex gap-3">
            <Button type="button" secondary onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={!canSubmit || isLoading}>{isLoading ? t('orders.creating') : t('orders.createOrder')}</Button>
          </div>
        </div>
      </form>
    </Modal>
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

