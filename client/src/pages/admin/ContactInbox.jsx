import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/api';
import { buildReplyMailto } from '../../lib/replyTemplates';

const STATUS_STYLES = {
  new: 'bg-amber-100 text-amber-800',
  read: 'bg-blue-100 text-blue-700',
  replied: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
};
 
const TYPE_STYLES = {
  buyer: 'bg-leaf/20 text-forest',
  investor: 'bg-forest text-white',
};
 
export default function ContactInbox() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ type: '', status: '' });
  const [expanded, setExpanded] = useState(null);
 
  const { data, isLoading } = useQuery({
    queryKey: ['contact-inbox', page, filters],
    queryFn: () =>
      apiClient
        .get('/admin/contact', { params: { page, limit: 20, ...filters } })
        .then(r => r.data),
    keepPreviousData: true,
  });
 
  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => apiClient.patch(`/admin/contact/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contact-inbox'] }),
  });
 
  const deleteSubmission = useMutation({
    mutationFn: (id) => apiClient.delete(`/admin/contact/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contact-inbox'] }),
  });
 
  const rows = data?.data || [];
  const pagination = data?.pagination;
  const newCount = data?.new_count || 0;
 
  const toggleExpand = (row) => {
    setExpanded(expanded === row.id ? null : row.id);
    // Opening a "new" inquiry marks it as read
    if (expanded !== row.id && row.status === 'new') {
      updateStatus.mutate({ id: row.id, status: 'read' });
    }
  };
 
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="font-display text-3xl text-forest">{t('inquiries.title')}</h2>
        {newCount > 0 && (
          <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-full">
            {t('inquiries.newBadge', { count: newCount })}
          </span>
        )}
      </div>
 
      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          value={filters.type}
          onChange={e => { setFilters(f => ({ ...f, type: e.target.value })); setPage(1); }}
          className="border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20"
        >
          <option value="">{t('inquiries.allTypes')}</option>
          <option value="buyer">{t('inquiries.buyer')}</option>
          <option value="investor">{t('inquiries.investor')}</option>
        </select>
        <select
          value={filters.status}
          onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
          className="border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20"
        >
          <option value="">{t('inquiries.allStatuses')}</option>
          <option value="new">{t('inquiries.statusNew')}</option>
          <option value="read">{t('inquiries.statusRead')}</option>
          <option value="replied">{t('inquiries.statusReplied')}</option>
          <option value="archived">{t('inquiries.statusArchived')}</option>
        </select>
      </div>
 
      {isLoading ? (
        <p className="text-muted">{t('common.loading')}</p>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-10 text-center text-muted">
          {t('inquiries.empty')}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(row => (
            <div
              key={row.id}
              className={`bg-white rounded-2xl border transition ${
                row.status === 'new' ? 'border-amber-300 shadow-sm' : 'border-border'
              }`}
            >
              {/* Summary row */}
              <button
                type="button"
                onClick={() => toggleExpand(row)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left"
              >
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${TYPE_STYLES[row.type] || ''}`}>
                  {row.type}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${row.status === 'new' ? 'font-semibold' : 'font-medium'}`}>
                    {row.name}{row.company ? ` · ${row.company}` : ''}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {row.type === 'buyer'
                      ? `${row.product || '—'}${row.quantity ? ` · ${row.quantity}` : ''}`
                      : `${row.interest || 'Inquiry'} · ${(row.message || '').slice(0, 60)}`}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded capitalize ${STATUS_STYLES[row.status] || ''}`}>
                  {row.status}
                </span>
                <span className="text-xs text-muted whitespace-nowrap hidden sm:block">
                  {new Date(row.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
                <span className="text-muted">{expanded === row.id ? '▴' : '▾'}</span>
              </button>
 
              {/* Detail */}
              {expanded === row.id && (
                <div className="px-5 pb-5 border-t border-border pt-4">
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <p><span className="text-muted">{t('common.email')}:</span>{' '}
                      <a href={`mailto:${row.email}`} className="text-forest underline">{row.email}</a>
                    </p>
                    {row.phone && <p><span className="text-muted">{t('common.phone')}:</span> {row.phone}</p>}
                    {row.product && <p><span className="text-muted">{t('common.product')}:</span> {row.product}</p>}
                    {row.quantity && <p><span className="text-muted">{t('common.quantity')}:</span> {row.quantity}</p>}
                    {row.interest && <p><span className="text-muted">{t('inquiries.interest')}:</span> {row.interest}</p>}
                    <p><span className="text-muted">{t('inquiries.received')}:</span> {new Date(row.created_at).toLocaleString()}</p>
                  </div>
                  {row.message && (
                    <p className="mt-3 text-sm bg-cream/50 rounded-xl p-4 whitespace-pre-wrap">{row.message}</p>
                  )}
 
                  <div className="flex flex-wrap gap-2 mt-4">
                    {row.status !== 'replied' && (
                      <button
                        onClick={() => updateStatus.mutate({ id: row.id, status: 'replied' })}
                        className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100"
                      >
                        ✓ {t('inquiries.markReplied')}
                      </button>
                    )}
                    {row.status !== 'archived' && (
                      <button
                        onClick={() => updateStatus.mutate({ id: row.id, status: 'archived' })}
                        className="text-xs px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"
                      >
                        {t('inquiries.archive')}
                      </button>
                    )}
                    {/* Opens the mail client with recipient, subject and the
                        correct template body (buyer / investor) pre-filled. */}
                    <a
                      href={buildReplyMailto(row)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-forest text-white hover:bg-forest-mid"
                    >
                      ✉ {row.type === 'investor' ? t('inquiries.replyInvestor') : t('inquiries.replyBuyer')}
                    </a>
                    <button
                      onClick={() => { if (confirm(t('inquiries.confirmDelete'))) deleteSubmission.mutate(row.id); }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 ml-auto"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
 
      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 text-sm rounded-full ${p === page ? 'bg-forest text-white' : 'border border-border hover:bg-cream'}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}