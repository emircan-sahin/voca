import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { DashboardLayout } from '~/layouts/DashboardLayout';
import { SetupPage } from '~/pages/Setup';
import { useAuthStore } from '~/stores/auth.store';

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
  const { hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

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

  if (ready === null) return null;

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
      {ready ? <DashboardLayout /> : <SetupPage onGranted={() => setReady(true)} />}
    </QueryClientProvider>
  );
};

export default App;
