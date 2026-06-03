import { useState } from 'react';
import CropOS from './CropOS';
import FinanceOS from './FinanceOS';
import FarmerOS from './FarmerOS';
import WarRoom from './WarRoom';

const TABS = [
  { key: 'crop', label: 'CropOS', emoji: '🌿' },
  { key: 'finance', label: 'Finance', emoji: '💰' },
  { key: 'farmers', label: 'Farmers', emoji: '👨‍🌾' },
  { key: 'warroom', label: 'War Room', emoji: '⚡' },
];

export default function FarmDashboard() {
  const [tab, setTab] = useState('crop');

  return (
    <div>
      <h2 className="font-display text-3xl text-forest mb-2">Farm Operations</h2>
      <p className="text-sm text-muted mb-4">Ghotiya, Bastar · HBF Project</p>
      <div className="flex bg-white border-b border-border mb-6 sticky top-0 z-10">
        {TABS.map(({ key, label, emoji }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-3 px-2 text-xs font-semibold uppercase tracking-wide border-b-2 transition ${
              tab === key ? 'border-forest text-forest' : 'border-transparent text-muted hover:text-forest'
            }`}
          >
            <span className="text-lg">{emoji}</span> <span className="ml-1">{label}</span>
          </button>
        ))}
      </div>
      {tab === 'crop' && <CropOS />}
      {tab === 'finance' && <FinanceOS />}
      {tab === 'farmers' && <FarmerOS />}
      {tab === 'warroom' && <WarRoom />}
    </div>
  );
}