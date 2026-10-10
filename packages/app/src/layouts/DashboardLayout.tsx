import { useEffect, useState } from 'react';
import { AppSidebar } from '~/components/AppSidebar';
import { TopHeader } from '~/components/TopHeader';
import { ShortcutsPanel } from '~/components/ShortcutsPanel';
import { OnboardingWizard } from '~/components/OnboardingWizard';
import { DashboardView } from '~/pages/Dashboard';
import { HistoryView } from '~/pages/History';
import { SettingsView } from '~/pages/Settings';
// import { BillingView } from '~/pages/Billing';
import { useTranscription } from '~/hooks/useTranscription';
import { useTrayLastTranscript } from '~/hooks/useTray';
import { useNavigationStore } from '~/stores/navigation.store';
import { useOnboardingStore } from '~/stores/onboarding.store';
import { useAuthStore } from '~/stores/auth.store';
// import { refreshUser } from '~/stores/auth.store'; // only used by usePlanExpiryWatcher

// Accounts older than this already know the app, so the first-run wizard only opens for them on request.
const NEW_ACCOUNT_MS = 7 * 24 * 60 * 60 * 1000;

// Paid plans are disabled, so there is no plan expiry to watch.
// function usePlanExpiryWatcher() {
//   const { user } = useAuthStore();
//
//   useEffect(() => {
//     if (!user?.currentPeriodEnd) return;
//
//     const interval = setInterval(() => {
//       const remaining = new Date(user.currentPeriodEnd!).getTime() - Date.now();
//       if (remaining <= 0) refreshUser();
//     }, 60_000);
//
//     return () => clearInterval(interval);
//   }, [user?.currentPeriodEnd]);
// }

export const DashboardLayout = () => {
  const { view } = useNavigationStore();
  const { completed: onboardingCompleted, replay: onboardingReplay } = useOnboardingStore();
  const createdAt = useAuthStore((s) => s.user?.createdAt);
  const isNewAccount = !!createdAt && Date.now() - Date.parse(createdAt) < NEW_ACCOUNT_MS;
  const showOnboarding = !onboardingCompleted && (isNewAccount || onboardingReplay);
  const {
    isRecording,
    isProcessing,
    handleToggle,
    handleDelete,
    transcripts,
    hasMoreTranscripts,
    isLoadingMoreTranscripts,
    loadMoreTranscripts,
  } = useTranscription();
  const [appVersion, setAppVersion] = useState<string | null>(null);
  useTrayLastTranscript(transcripts);

  useEffect(() => {
    window.electronAPI.getVersion().then(setAppVersion).catch((err) => console.warn('[Layout] Failed to get app version:', err.message ?? err));
  }, []);

  // usePlanExpiryWatcher();

  return (
    <div className="flex h-screen bg-[#fafafa]">
      <AppSidebar transcriptCount={transcripts.length} hasMoreTranscripts={hasMoreTranscripts} appVersion={appVersion} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopHeader />
        {/* key resets scroll position when switching views */}
        <div key={view} className="flex-1 overflow-y-auto">
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
              hasMore={hasMoreTranscripts}
              isLoadingMore={isLoadingMoreTranscripts}
              onLoadMore={loadMoreTranscripts}
              onDelete={handleDelete}
            />
          )}
          {view === 'settings' && <SettingsView />}
          {/* {view === 'billing' && <BillingView />} */}
        </div>
      </div>
      {/* Stays inside this layout: the "try it" step needs the recording hook above */}
      {showOnboarding && (
        <OnboardingWizard
          isRecording={isRecording}
          isProcessing={isProcessing}
          onToggle={handleToggle}
          transcripts={transcripts}
        />
      )}
      <ShortcutsPanel />
    </div>
  );
};
