import { useState } from 'react';
import { useTranslation } from 'react-i18next';
 
// Pass onReorder(fromIndex, toIndex) to enable drag-and-drop row reordering —
// a ⠿ handle column appears and rows become draggable.
export default function DataTable({ columns, data, onRowClick, actions, isLoading, onReorder }) {
  const { t } = useTranslation();
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  if (isLoading) {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
        <div className="flex items-center justify-center py-16">
          <div className="w-7 h-7 border-2 border-forest border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
        <div className="py-16 text-center text-sm text-muted">{t('common.noData')}</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.02)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ece6dc' }}>
              {onReorder && <th style={{ width: 36, background: '#faf8f4' }} />}
              {columns.map(col => (
                <th
                  key={col.header}
                  className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: '#52674c', background: '#faf8f4' }}
                >
                  {col.header}
                </th>
              ))}
              {actions && (
                <th className="text-right px-5 py-3.5 text-xs font-semibold uppercase tracking-wide" style={{ color: '#52674c', background: '#faf8f4' }}>
                  {t('common.actions')}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={row.id || idx}
                onClick={() => onRowClick && onRowClick(row)}
                className="transition-colors"
                draggable={!!onReorder}
                onDragStart={onReorder ? () => setDragIdx(idx) : undefined}
                onDragOver={onReorder ? (e) => { e.preventDefault(); setOverIdx(idx); } : undefined}
                onDragLeave={onReorder ? () => setOverIdx(o => (o === idx ? null : o)) : undefined}
                onDrop={onReorder ? () => {
                  if (dragIdx != null && dragIdx !== idx) onReorder(dragIdx, idx);
                  setDragIdx(null); setOverIdx(null);
                } : undefined}
                onDragEnd={onReorder ? () => { setDragIdx(null); setOverIdx(null); } : undefined}
                style={{
                  borderBottom: idx < data.length - 1 ? '1px solid #f1ebe2' : 'none',
                  background: overIdx === idx && dragIdx !== null && dragIdx !== idx
                    ? '#e8f0e6'
                    : idx % 2 === 1 ? '#faf8f4' : '#fff',
                  cursor: onRowClick ? 'pointer' : 'default',
                  opacity: dragIdx === idx ? 0.5 : 1,
                }}
                onMouseEnter={e => { if (onRowClick) e.currentTarget.style.background = '#f4f0e8'; }}
                onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 1 ? '#faf8f4' : '#fff'}
              >
                {onReorder && (
                  <td
                    className="px-2 py-3.5 text-center select-none"
                    style={{ cursor: 'grab', color: '#a8a294' }}
                    onClick={e => e.stopPropagation()}
                    title={t('common.dragToReorder')}
                  >
                    ⠿
                  </td>
                )}
                {columns.map(col => (
                  <td key={col.header} className="px-5 py-3.5" style={{ color: '#1f2e1c' }}>
                    {col.render
                      ? col.render(row[col.accessor], row)
                      : (row[col.accessor] ?? '—')}
                  </td>
                ))}
                {actions && (
                  <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* initial code
export default function DataTable({ columns, data, onRowClick, actions, isLoading }) {
  if (isLoading) {
    return <div className="text-center py-8 text-muted">Loading...</div>;
  }
  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-muted">No data found.</div>;
  }
  return (
    <div className="overflow-x-auto border border-border rounded-sm">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-cream-dark">
          <tr>
            {columns.map((col) => (
              <th key={col.header} className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                {col.header}
              </th>
            ))}
            {actions && <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Actions</th>}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-border">
          {data.map((row, idx) => (
            <tr key={row.id || idx} onClick={() => onRowClick && onRowClick(row)} className={onRowClick ? 'cursor-pointer hover:bg-cream/50' : ''}>
              {columns.map((col) => (
                <td key={col.header} className="px-4 py-3 text-sm text-gray-700">
                  {col.render ? col.render(row[col.accessor], row) : row[col.accessor]}
                </td>
              ))}
              {actions && <td className="px-4 py-3 text-right">{actions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
*/