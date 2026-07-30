import FinanceOS from './Farm/FinanceOS';
 
// Finance was previously a tab inside Farm Ops; it now lives directly in the
// main sidebar. The FinanceOS component is reused unchanged.
export default function Finance() {
  return (
    <div>
      <h2 className="font-display text-3xl text-forest mb-2">Finance</h2>
      <p className="text-sm text-muted mb-6">Cash position, expenses, revenue and EMI overview</p>
      <FinanceOS />
    </div>
  );
}