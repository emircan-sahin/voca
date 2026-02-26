import { useEffect, useState } from 'react';
import { AppSidebar } from '~/components/AppSidebar';
import { TopHeader } from '~/components/TopHeader';
import { ShortcutsPanel } from '~/components/ShortcutsPanel';
import { DashboardView } from '~/pages/Dashboard';
import { HistoryView } from '~/pages/History';
import { SettingsView } from '~/pages/Settings';
import { BillingView } from '~/pages/Billing';
import { useTranscription } from '~/hooks/useTranscription';
import { useNavigationStore } from '~/stores/navigation.store';
import { useAuthStore, refreshUser } from '~/stores/auth.store';

function usePlanExpiryWatcher() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user?.currentPeriodEnd) return;

    const interval = setInterval(() => {
      const remaining = new Date(user.currentPeriodEnd!).getTime() - Date.now();
      if (remaining <= 0) refreshUser();
    }, 60_000);

    return () => clearInterval(interval);
  }, [user?.currentPeriodEnd]);
}

export const DashboardLayout = () => {
  const { view } = useNavigationStore();
  const { isRecording, isProcessing, handleToggle, handleDelete, transcripts } =
    useTranscription();
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    window.electronAPI.getVersion().then(setAppVersion);
  }, []);

  usePlanExpiryWatcher();

  return (
    <div className="flex h-screen bg-[#fafafa]">
      <AppSidebar transcriptCount={transcripts.length} appVersion={appVersion} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopHeader />
        <div className="flex-1 overflow-y-auto">
          {view === 'dashboard' && (
            <DashboardView
              isRecording={isRecording}
              isProcessing={isProcessing}
              onToggle={handleToggle}
              transcripts={transcripts}
              onDelete={handleDelete}
            />
          )}
          {view === 'history' && (
            <HistoryView
              transcripts={transcripts}
              onDelete={handleDelete}
            />
          )}
          {view === 'settings' && <SettingsView />}
          {view === 'billing' && <BillingView />}
        </div>
      </div>
      <ShortcutsPanel />
    </div>
  );
};
