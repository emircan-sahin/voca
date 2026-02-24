import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { DashboardLayout } from '~/layouts/DashboardLayout';
import { SetupPage } from '~/pages/Setup';
import { WelcomePage } from '~/pages/Welcome';
import { SplashScreen } from '~/components/SplashScreen';
import { useAuthStore } from '~/stores/auth.store';
import { useSettingsSync } from '~/hooks/useSettingsSync';
import { useBackendReady } from '~/hooks/useBackendReady';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 1000 * 30,
    },
  },
});

const App = () => {
  const [ready, setReady] = useState<boolean | null>(null);
  const { user, isLoading, hydrate } = useAuthStore();
  const { ready: backendReady, retryIn } = useBackendReady();

  useEffect(() => {
    if (backendReady) hydrate();
  }, [backendReady, hydrate]);

  useSettingsSync();

  useEffect(() => {
    const isMac = window.electronAPI.platform === 'darwin';
    if (!isMac) {
      setReady(true);
      return;
    }

    Promise.all([
      window.electronAPI.permissions.getMicrophoneStatus(),
      window.electronAPI.permissions.getAccessibilityStatus(),
    ]).then(([mic, accessibility]) => {
      setReady(mic === 'granted' && accessibility);
    });
  }, []);

  if (!backendReady) return <SplashScreen retryIn={retryIn} />;
  if (ready === null || isLoading) return null;

  const content = !ready
    ? <SetupPage onGranted={() => setReady(true)} />
    : !user
      ? <WelcomePage />
      : <DashboardLayout />;

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#171717',
            border: '1px dashed #e5e5e5',
            boxShadow: 'none',
            borderRadius: '0',
          },
        }}
      />
      {content}
    </QueryClientProvider>
  );
};

export default App;
