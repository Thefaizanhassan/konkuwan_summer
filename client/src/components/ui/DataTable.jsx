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