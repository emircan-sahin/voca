import { useTranslation } from 'react-i18next';

export default function PromoBanner() {
  const { t } = useTranslation();

  return (
    <div className="bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 px-4 py-2 text-center">
      <span className="text-sm font-medium text-white">{t('banner.promo')}</span>
    </div>
  );
}
