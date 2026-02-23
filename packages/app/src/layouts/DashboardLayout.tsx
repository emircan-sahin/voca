import { useEffect } from 'react';
import { IUser } from '@voca/shared';
import { AppSidebar } from '~/components/AppSidebar';
import { TopHeader } from '~/components/TopHeader';
import { ShortcutsPanel } from '~/components/ShortcutsPanel';
import { DashboardView } from '~/pages/Dashboard';
import { HistoryView } from '~/pages/History';
import { SettingsView } from '~/pages/Settings';
import { BillingView } from '~/pages/Billing';
import { useTranscription } from '~/hooks/useTranscription';
import { useNavigationStore } from '~/stores/navigation.store';
import { useAuthStore } from '~/stores/auth.store';
import { api } from '~/lib/axios';

function refreshUser() {
  api.get<IUser>('/auth/me').then((res) => {
    if (res.data) useAuthStore.setState({ user: res.data });
  }).catch((err) => {
    console.warn('[PlanExpiry] Failed to refresh user:', err.message ?? err);
  });
}

function usePlanExpiryWatcher() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user?.planExpiresAt) return;

    const interval = setInterval(() => {
      const remaining = new Date(user.planExpiresAt!).getTime() - Date.now();
      if (remaining <= 0) refreshUser();
    }, 60_000);

    return () => clearInterval(interval);
  }, [user?.planExpiresAt]);
}

export const DashboardLayout = () => {
  const { view } = useNavigationStore();
  const { isRecording, isProcessing, handleToggle, handleDelete, transcripts } =
    useTranscription();

  usePlanExpiryWatcher();

  return (
    <div className="flex h-screen bg-[#fafafa]">
      <AppSidebar transcriptCount={transcripts.length} />
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
