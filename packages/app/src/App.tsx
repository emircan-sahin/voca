import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { HomePage } from '~/pages/Home';
import { SetupPage } from '~/pages/Setup';

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
          style: { background: '#1f2937', color: '#f9fafb', border: '1px solid #374151' },
        }}
      />
      {ready ? <HomePage /> : <SetupPage onGranted={() => setReady(true)} />}
    </QueryClientProvider>
  );
};

export default App;
