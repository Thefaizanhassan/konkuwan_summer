import { useTranslation } from 'react-i18next';
import FinanceOS from './Farm/FinanceOS';
 
// Finance was previously a tab inside Farm Ops; it now lives directly in the
// main sidebar. The FinanceOS component is reused unchanged.
export default function Finance() {
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="font-display text-3xl text-forest mb-2">{t('finance.title')}</h2>
      <p className="text-sm text-muted mb-6">{t('finance.subtitle')}</p>
      <FinanceOS />
    </div>
  );
}