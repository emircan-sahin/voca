import { useTranslation } from 'react-i18next';
import { MicrophoneSelect } from '~/components/MicrophoneSelect';
import { useNavigationStore, View } from '~/stores/navigation.store';

const viewI18nKeys: Record<View, string> = {
  dashboard: 'header.dashboard',
  history: 'header.history',
  settings: 'header.settings',
  billing: 'header.billing',
};

export const TopHeader = () => {
  const { t } = useTranslation();
  const { view } = useNavigationStore();

  return (
    <div className="h-16 flex items-center justify-between border-b-2 border-dashed border-slate-200 px-6">
      <h2 className="text-sm font-semibold text-[#171717]">{t(viewI18nKeys[view])}</h2>
      <MicrophoneSelect />
    </div>
  );
};
