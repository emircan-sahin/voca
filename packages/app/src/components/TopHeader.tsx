import { MicrophoneSelect } from '~/components/MicrophoneSelect';
import { useNavigationStore, View } from '~/stores/navigation.store';

const viewTitles: Record<View, string> = {
  dashboard: 'Dashboard',
  history: 'History',
  settings: 'Settings',
  billing: 'Billing',
};

export const TopHeader = () => {
  const { view } = useNavigationStore();

  return (
    <div className="h-16 flex items-center justify-between border-b-2 border-dashed border-slate-200 px-6">
      <h2 className="text-sm font-semibold text-[#171717]">{viewTitles[view]}</h2>
      <MicrophoneSelect />
    </div>
  );
};
