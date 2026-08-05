import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/api';
import Modal from '../ui/Modal';
import StatusBadge from '../ui/StatusBadge';
import Button from '../ui/Button';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { downloadInvoice, downloadQuotation } from '../../lib/invoice';

const STATUS_FLOW = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['dispatched', 'cancelled'],
  dispatched: ['delivered'],
  delivered: [],
  cancelled: [],
};

export default function OrderDetail({ order, onClose }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editingItemId, setEditingItemId] = useState(null);
  const [finalPriceInput, setFinalPriceInput] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [quoting, setQuoting] = useState(false);
 
  const handleInvoice = async () => {
    setDownloading(true);
    try {
      await downloadInvoice(order.id);
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    } catch (err) {
      alert(err?.response?.data?.message || t('orders.invoiceFailed'));
    } finally {
      setDownloading(false);
    }
  };

  const handleQuotation = async () => {
    setQuoting(true);
    try {
      await downloadQuotation(order.id);
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    } catch (err) {
      alert(err?.response?.data?.message || t('orders.quotationFailed'));
    } finally {
      setQuoting(false);
    }
  };

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
            <h3 className="font-display text-2xl text-forest">{t('orders.orderDetails')}</h3>
            <p className="text-sm text-muted mt-1">#{order.id.slice(0, 8).toUpperCase()}</p>
            {order.quotation_number && (
              <p className="text-xs text-sage mt-0.5">{t('orders.quotationRef')}: {order.quotation_number}</p>
            )}
            {order.invoice_number && (
              <p className="text-xs text-sage">{t('orders.invoiceRef')}: {order.invoice_number}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={order.status} />
            <div className="flex items-center gap-2">
              <Button type="button" secondary onClick={handleQuotation} disabled={quoting}>
                {quoting ? t('common.generating') : `📄 ${t('orders.generateQuotation')}`}
              </Button>
              <Button type="button" secondary onClick={handleInvoice} disabled={downloading}>
                {downloading ? t('common.generating') : `🧾 ${t('orders.generateInvoice')}`}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted uppercase text-xs tracking-wider">{t('orders.customer')}</p>
            <p className="font-medium">{order.Customer?.company_name}</p>
          </div>
          <div>
            <p className="text-muted uppercase text-xs tracking-wider">{t('orders.orderDate')}</p>
            <p className="font-medium">{new Date(order.order_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-muted uppercase text-xs tracking-wider">{t('orders.totalAmount')}</p>
            <p className="font-medium text-forest">₹{Number(order.total_amount || 0).toLocaleString()}</p>
          </div>
          {order.final_note && (
            <div className="col-span-2">
              <p className="text-muted uppercase text-xs tracking-wider">{t('common.notes')}</p>
              <p className="font-medium">{order.final_note}</p>
            </div>
          )}
        </div>

        <div>
          <p className="text-muted uppercase text-xs tracking-wider mb-2">{t('orders.lineItems')}</p>
          <div className="border border-border rounded-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-cream-dark text-xs text-muted uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">{t('common.product')}</th>
                  <th className="px-3 py-2 text-right">{t('common.quantity')}</th>
                  <th className="px-3 py-2 text-right">{t('orders.unitPrice')}</th>
                  <th className="px-3 py-2 text-right">{t('orders.finalPrice')}</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.items?.map(item => (
                  <tr key={item.id}>
                    <td className="px-3 py-2">{item.Product?.name || item.product?.name || item.product_name || '—'}</td>
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
                            placeholder={t('common.amount')}
                          />
                          <Button
                            type="button"
                            onClick={() => setFinalPrice.mutate({ itemId: item.id, final_price: parseFloat(finalPriceInput) })}
                            disabled={setFinalPrice.isLoading || !finalPriceInput}
                          >
                            {t('common.save')}
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
                          {t('orders.setPrice')}
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
            <p className="text-sm text-muted w-full">{t('orders.moveTo')}</p>
            {nextStatuses.map(s => (
              <Button
                key={s}
                type="button"
                secondary={s === 'cancelled'}
                onClick={() => updateStatus.mutate({ status: s })}
                disabled={updateStatus.isLoading}
              >
                {t(`orders.status.${s}`)}
              </Button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}