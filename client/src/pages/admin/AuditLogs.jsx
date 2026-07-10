import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api';

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ entity_type: '', action: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, filters],
    queryFn: () =>
      apiClient
        .get('/admin/audit-logs', { params: { page, limit: 30, ...filters } })
        .then(r => r.data),
    keepPreviousData: true,
  });

  const logs = data?.data || [];
  const pagination = data?.pagination;

  const ENTITY_TYPES = ['product', 'order', 'user', 'customer', 'category', 'settings', 'contact'];
  const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'DEACTIVATE', 'IMPORT', 'INVITE', 'LOGIN'];

  return (
    <div>
      <h2 className="font-display text-3xl text-forest mb-6">Audit Logs</h2>

      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          value={filters.entity_type}
          onChange={e => { setFilters(f => ({ ...f, entity_type: e.target.value })); setPage(1); }}
          className="border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20"
        >
          <option value="">All entities</option>
          {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filters.action}
          onChange={e => { setFilters(f => ({ ...f, action: e.target.value })); setPage(1); }}
        //   className="border border-border rounded-sm px-3 py-2 text-sm" // may need to chnage back
            className="border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20"
        >
          <option value="">All actions</option>
          {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {isLoading ? (
        <p className="text-muted">Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl" style={{ background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
          <table className="min-w-full text-sm">
            <thead className="bg-cream-dark text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left">Entity</th>
                <th className="px-4 py-3 text-left">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No logs found.</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-cream/40">
                  <td className="px-4 py-3 text-muted whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{log.user?.name || log.user?.email || log.user_id?.slice(0, 8) || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                      log.action === 'DELETE' || log.action === 'DEACTIVATE' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{log.action}</span>
                  </td>
                  <td className="px-4 py-3 capitalize">{log.entity_type}{log.entity_id ? ` #${log.entity_id.slice(0, 8)}` : ''}</td>
                  <td className="px-4 py-3 text-muted text-xs max-w-xs truncate">
                    {log.new_values ? JSON.stringify(log.new_values).slice(0, 80) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
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