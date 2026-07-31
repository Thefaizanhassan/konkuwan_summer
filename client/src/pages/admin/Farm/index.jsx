import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import CropOS from './CropOS';
// import FinanceOS from './FinanceOS';
import FarmerOS from './FarmerOS';
import WarRoom from './WarRoom';

// Finance moved to its own top-level sidebar page (/admin/finance).
const TABS = [
  { key: 'crop', labelKey: 'farm.tabs.crop', emoji: '🌿' },
  { key: 'farmers', labelKey: 'farm.tabs.farmers', emoji: '👨‍🌾' },
  { key: 'warroom', labelKey: 'farm.tabs.warroom', emoji: '⚡' },
];

export default function FarmDashboard() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('crop');

  return (
    <div>
      <h2 className="font-display text-3xl text-forest mb-2">{t('farm.title')}</h2>
      <p className="text-sm text-muted mb-4">{t('farm.subtitle')}</p>
      <div className="flex bg-white border-b border-border mb-6 sticky top-0 z-10">
        {TABS.map(({ key, labelKey, emoji }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-3 px-2 text-xs font-semibold uppercase tracking-wide border-b-2 transition ${
              tab === key ? 'border-forest text-forest' : 'border-transparent text-muted hover:text-forest'
            }`}
          >
            <span className="text-lg">{emoji}</span> <span className="ml-1">{t(labelKey)}</span>
          </button>
        ))}
      </div>
      {tab === 'crop' && <CropOS />}
      {/* {tab === 'finance' && <FinanceOS />} */}
      {tab === 'farmers' && <FarmerOS />}
      {tab === 'warroom' && <WarRoom />}
    </div>
  );
}