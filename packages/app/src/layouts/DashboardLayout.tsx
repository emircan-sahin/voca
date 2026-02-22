import { AppSidebar } from '~/components/AppSidebar';
import { TopHeader } from '~/components/TopHeader';
import { ShortcutsPanel } from '~/components/ShortcutsPanel';
import { DashboardView } from '~/pages/Dashboard';
import { HistoryView } from '~/pages/History';
import { SettingsView } from '~/pages/Settings';
import { useTranscription } from '~/hooks/useTranscription';
import { useNavigationStore } from '~/stores/navigation.store';

export const DashboardLayout = () => {
  const { view } = useNavigationStore();
  const { isRecording, isProcessing, handleToggle, handleDelete, transcripts } =
    useTranscription();

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
        </div>
      </div>
      <ShortcutsPanel />
    </div>
  );
};
