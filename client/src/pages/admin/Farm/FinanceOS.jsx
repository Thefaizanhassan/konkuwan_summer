import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import apiClient from '../../../services/api';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const CATEGORIES = [
  { id: 'labour', label: 'Labour', emoji: '👷', color: '#f59e0b' },
  { id: 'procurement', label: 'Procurement', emoji: '🌾', color: '#10b981' },
  { id: 'travel', label: 'Travel', emoji: '🚗', color: '#3b82f6' },
  { id: 'seeds', label: 'Seeds/Inputs', emoji: '🌱', color: '#8b5cf6' },
  { id: 'processing', label: 'Processing', emoji: '⚙️', color: '#ef4444' },
  { id: 'admin', label: 'Admin', emoji: '📋', color: '#6b7280' },
  { id: 'rent', label: 'Rent/Land', emoji: '🏘️', color: '#d97706' },
  { id: 'other', label: 'Other', emoji: '📦', color: '#94a3b8' },
];

export default function FinanceOS() {
  const queryClient = useQueryClient();
  const [expForm, setExpForm] = useState({ date: new Date().toISOString().slice(0,10), by: 'CRP', amount: '', category: 'labour', description: '' });
  const [revForm, setRevForm] = useState({ date: new Date().toISOString().slice(0,10), amount: '', note: '' });
  const [cashVal, setCashVal] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

//  const { data: expenses } = useQuery(['farm-expenses'], () => apiClient.get('/admin/farm/expenses').then(r => r.data.data));
//  const { data: cash } = useQuery(['farm-cash'], () => apiClient.get('/admin/farm/cash').then(r => r.data.data));
  const { data: expenses } = useQuery({
   queryKey: ['farm-expenses'],
   queryFn: () => apiClient.get('/admin/farm/expenses').then(r => r.data.data),
  });
  const { data: cash } = useQuery({
   queryKey: ['farm-cash'],
   queryFn: () => apiClient.get('/admin/farm/cash').then(r => r.data.data),
  });
  const { data: finSettings } = useQuery({
   queryKey: ['farm-finance-settings'],
   queryFn: () => apiClient.get('/admin/farm/finance-settings').then(r => r.data.data),
  });
  // Server-computed monthly summary — revenue here includes product sales
  // from Orders (confirmed/dispatched/delivered), so Finance and Orders stay in sync.
  const { data: finSummary } = useQuery({
   queryKey: ['farm-finance-summary'],
   queryFn: () => apiClient.get('/admin/farm/finance-summary').then(r => r.data.data),
  });

  const addExpense = useMutation({
    mutationFn: (data) => apiClient.post('/admin/farm/expenses', { ...data, type: 'expense' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farm-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['farm-finance-summary'] });
    },
  });
  const addRevenue = useMutation({
    mutationFn: (data) => apiClient.post('/admin/farm/expenses', { ...data, type: 'revenue' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farm-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['farm-finance-summary'] });
    },
  });
  const updateCash = useMutation({
    mutationFn: (amount) => apiClient.put('/admin/farm/cash', { amount }),
    // onSuccess: () => queryClient.invalidateQueries(['farm-cash']),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['farm-cash'] }),
  });
  const deleteEntry = useMutation({
    mutationFn: (id) => apiClient.delete(`/admin/farm/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farm-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['farm-finance-summary'] });
    },
  });

  const thisMonth = new Date().toISOString().slice(0,7);
  const mExp = expenses?.filter(e => e.date.startsWith(thisMonth) && e.type === 'expense') || [];
  const mRev = expenses?.filter(e => e.date.startsWith(thisMonth) && e.type === 'revenue') || [];
  // Prefer the server summary (includes order sales); fall back to local sums.
  const totalExp = finSummary?.expenses ?? mExp.reduce((s, e) => s + parseFloat(e.amount), 0);
  const loggedRev = finSummary?.logged_revenue ?? mRev.reduce((s, e) => s + parseFloat(e.amount), 0);
  const productSales = finSummary?.product_sales || 0;
  const totalRev = loggedRev + productSales;
  const cashAmount = parseFloat(cash?.amount) || 0;

  // EMI comes from Settings (emi_monthly_amount / emi_start_date / emi_label) — no hardcoded value.
  const emi = parseFloat(finSettings?.emi_monthly_amount) || 0;
  const emiStart = finSettings?.emi_start_date ? new Date(finSettings.emi_start_date) : null;
  const emiLabel = finSettings?.emi_label || 'EMI';
  const emiStarted = emiStart ? emiStart <= new Date() : true;
  const emiStartText = emiStart
    ? emiStart.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="space-y-6">
      {/* EMI Alert — calculated from Settings, not dummy data */}
      {emi > 0 ? (
        <div className="bg-forest rounded-xl p-5 text-white">
          <p className="text-xs uppercase tracking-widest opacity-70">EMI Alert</p>
          <p className="text-2xl font-mono font-bold">₹{emi.toLocaleString('en-IN')}/mo</p>
          <p className="text-xs mt-1 opacity-80">
            {emiStartText
              ? `${emiLabel} ${emiStarted ? 'active since' : 'begins'} ${emiStartText}`
              : emiLabel}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-5 border border-dashed text-muted text-sm">
          No EMI configured. A super admin can set <b>Monthly EMI</b>, <b>EMI Start Date</b> and{' '}
          <b>EMI Label</b> under Admin → Settings → Farm Finance.
        </div>
      )}

      {/* Cash position */}
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="font-display text-lg mb-2">Cash Position</h3>
        <div className="flex gap-2">
          <Input type="number" placeholder="Total cash" value={cashVal} onChange={e => setCashVal(e.target.value)} />
          <Button onClick={() => updateCash.mutate(cashVal)}>Update</Button>
        </div>
        {cashAmount > 0 && emi > 0 && (
          <div className={`mt-3 p-3 rounded-lg ${
            cashAmount > emi*2 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            Safe deploy (cash − 2× EMI): ₹{Math.max(0, cashAmount - emi*2).toLocaleString('en-IN')}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-lg border text-center">
          <p className="text-xs uppercase tracking-wider text-green-700">Revenue This Month</p>
          <p className="text-xl font-mono font-bold text-green-700">₹{totalRev.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-muted mt-0.5">
            ₹{loggedRev.toLocaleString('en-IN')} logged + ₹{productSales.toLocaleString('en-IN')} product sales
            {finSummary?.orders_count ? ` (${finSummary.orders_count} orders)` : ''}
          </p>
          <button onClick={() => document.getElementById('revSection').classList.toggle('hidden')} className="text-xs text-green-800 underline mt-1">+ Log</button>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <p className="text-xs uppercase tracking-wider text-orange-700">Expenses This Month</p>
          <p className="text-xl font-mono font-bold text-orange-700">₹{totalExp.toLocaleString()}</p>
        </div>
      </div>

      {/* Revenue form */}
      <div id="revSection" className="hidden bg-white p-4 rounded-lg border space-y-3">
        <h4 className="font-display">Log Revenue</h4>
        <div className="grid grid-cols-2 gap-3">
          <Input type="number" placeholder="Amount" value={revForm.amount} onChange={e => setRevForm({...revForm, amount: e.target.value})} />
          <Input type="date" value={revForm.date} onChange={e => setRevForm({...revForm, date: e.target.value})} />
        </div>
        <Input placeholder="Source / Buyer" value={revForm.note} onChange={e => setRevForm({...revForm, note: e.target.value})} />
        <Button onClick={() => addRevenue.mutate({ ...revForm, amount: parseFloat(revForm.amount) })}>Save Revenue</Button>
      </div>

      {/* Expense form */}
      <div className="bg-white p-4 rounded-lg border space-y-3">
        <h3 className="font-display text-lg">Log Expense</h3>
        <div className="grid grid-cols-2 gap-3">
          <Input type="date" value={expForm.date} onChange={e => setExpForm({...expForm, date: e.target.value})} />
          <select value={expForm.by} onChange={e => setExpForm({...expForm, by: e.target.value})} className="border rounded-sm p-2">
            {['Rajeshwar','Roopali','Field Coordinator','Field Assistant','CRP','Accountant'].map(n => <option key={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <button key={c.id} type="button" onClick={() => setExpForm({...expForm, category: c.id})}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border-2 ${
                expForm.category === c.id ? 'border-current bg-opacity-20' : 'border-border text-muted'
              }`}
              style={expForm.category === c.id ? { borderColor: c.color, backgroundColor: c.color + '30', color: c.color } : {}}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted mb-1">Bill / Receipt (optional)</label>
          <input type="file" accept="application/pdf,image/jpeg,image/png"
            onChange={e => setReceiptFile(e.target.files?.[0] || null)}
            className="block w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-sm file:border-0 file:bg-forest file:text-white" />
          {receiptFile && <p className="text-xs text-muted mt-1">{receiptFile.name} ({Math.round(receiptFile.size/1024)} KB)</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input type="number" placeholder="Amount" value={expForm.amount} onChange={e => setExpForm({...expForm, amount: e.target.value})} />
          <Input placeholder="Description" value={expForm.description} onChange={e => setExpForm({...expForm, description: e.target.value})} />
        </div>
        {/* <Button fullWidth onClick={() => addExpense.mutate({ ...expForm, amount: parseFloat(expForm.amount) })}>Add Expense</Button> */}
        <Button fullWidth disabled={addExpense.isPending || uploadingReceipt}
          onClick={async () => {
            let receipt_url = null;
            if (receiptFile) {
              if (receiptFile.size > 5 * 1024 * 1024) return alert('Receipt must be under 5 MB.');
              setUploadingReceipt(true);
              const path = `${Date.now()}-${receiptFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
              const { error } = await supabase.storage.from('receipts').upload(path, receiptFile);
              setUploadingReceipt(false);
              if (error) return alert('Receipt upload failed: ' + error.message);
              receipt_url = supabase.storage.from('receipts').getPublicUrl(path).data.publicUrl;
            }
            addExpense.mutate({ ...expForm, amount: parseFloat(expForm.amount), receipt_url });
            setReceiptFile(null);
          }}>
          {uploadingReceipt ? 'Uploading receipt…' : 'Add Expense'}
        </Button>
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b font-display text-lg">Recent Transactions</div>
        {expenses?.slice().reverse().slice(0, 10).map(e => {
          const cat = CATEGORIES.find(c => c.id === e.category);
          return (
            <div key={e.id} className="flex items-center gap-3 p-3 border-b last:border-0">
              <span>{cat?.emoji || '📦'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{e.description}</p>
                {e.receipt_url && (
                  <a href={e.receipt_url} target="_blank" rel="noopener noreferrer"
                     className="text-xs text-sage hover:text-forest">📎 Receipt</a>
                )}
                <p className="text-xs text-muted">{e.date} · {e.logged_by_name}</p>
              </div>
              {/* <span className="font-mono font-bold">₹{e.amount.toLocaleString()}</span> */}
              <span className="font-mono font-bold">₹{Number(e.amount).toLocaleString()}</span>
              <button onClick={() => deleteEntry.mutate(e.id)} className="text-red-500 text-lg">&times;</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}