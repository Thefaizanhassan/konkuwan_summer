import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/api';
import Modal from '../ui/Modal';
import StatusBadge from '../ui/StatusBadge';
import Button from '../ui/Button';
import { useState } from 'react';

const STATUS_FLOW = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['dispatched', 'cancelled'],
  dispatched: ['delivered'],
  delivered: [],
  cancelled: [],
};

export default function OrderDetail({ order, onClose }) {
  const queryClient = useQueryClient();
  const [editingItemId, setEditingItemId] = useState(null);
  const [finalPriceInput, setFinalPriceInput] = useState('');

  const updateStatus = useMutation({
    mutationFn: ({ status }) =>
      apiClient.put(`/admin/orders/${order.id}/status`, { status }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-orders']);
      onClose();
    },
  });

  const setFinalPrice = useMutation({
    mutationFn: ({ itemId, final_price }) =>
      apiClient
        .put(`/admin/orders/${order.id}/items/${itemId}/final-price`, { final_price })
        .then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-orders']);
      setEditingItemId(null);
      setFinalPriceInput('');
    },
  });

  const nextStatuses = STATUS_FLOW[order.status] || [];

  return (
    <Modal onClose={onClose}>
      <div className="space-y-5">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-display text-2xl text-forest">Order Details</h3>
            <p className="text-sm text-muted mt-1">#{order.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted uppercase text-xs tracking-wider">Customer</p>
            <p className="font-medium">{order.Customer?.company_name}</p>
          </div>
          <div>
            <p className="text-muted uppercase text-xs tracking-wider">Order Date</p>
            <p className="font-medium">{new Date(order.order_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-muted uppercase text-xs tracking-wider">Total Amount</p>
            <p className="font-medium text-forest">₹{Number(order.total_amount || 0).toLocaleString()}</p>
          </div>
          {order.final_note && (
            <div className="col-span-2">
              <p className="text-muted uppercase text-xs tracking-wider">Notes</p>
              <p className="font-medium">{order.final_note}</p>
            </div>
          )}
        </div>

        <div>
          <p className="text-muted uppercase text-xs tracking-wider mb-2">Line Items</p>
          <div className="border border-border rounded-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-cream-dark text-xs text-muted uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Unit price</th>
                  <th className="px-3 py-2 text-right">Final price</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.items?.map(item => (
                  <tr key={item.id}>
                    <td className="px-3 py-2">{item.Product?.name}</td>
                    <td className="px-3 py-2 text-right">{item.quantity} {item.unit}</td>
                    <td className="px-3 py-2 text-right">₹{item.unit_price}</td>
                    <td className="px-3 py-2 text-right">
                      {editingItemId === item.id ? (
                        <div className="flex gap-1 justify-end">
                          <input
                            type="number"
                            value={finalPriceInput}
                            onChange={e => setFinalPriceInput(e.target.value)}
                            className="w-24 border border-border px-2 py-1 rounded-sm text-xs"
                            placeholder="Amount"
                          />
                          <Button
                            type="button"
                            onClick={() => setFinalPrice.mutate({ itemId: item.id, final_price: parseFloat(finalPriceInput) })}
                            disabled={setFinalPrice.isLoading || !finalPriceInput}
                          >
                            Save
                          </Button>
                          <Button type="button" secondary onClick={() => setEditingItemId(null)}>✕</Button>
                        </div>
                      ) : (
                        <span className={item.final_price ? 'font-medium text-forest' : 'text-muted'}>
                          {item.final_price ? `₹${item.final_price}` : `₹${item.line_total || (item.quantity * item.unit_price)}`}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {order.status !== 'delivered' && order.status !== 'cancelled' && editingItemId !== item.id && (
                        <button
                          onClick={() => { setEditingItemId(item.id); setFinalPriceInput(item.final_price || ''); }}
                          className="text-sage text-xs hover:underline"
                        >
                          Set price
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {nextStatuses.length > 0 && (
          <div className="flex gap-2 flex-wrap pt-2 border-t border-border">
            <p className="text-sm text-muted w-full">Move to:</p>
            {nextStatuses.map(s => (
              <Button
                key={s}
                type="button"
                secondary={s === 'cancelled'}
                onClick={() => updateStatus.mutate({ status: s })}
                disabled={updateStatus.isLoading}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}