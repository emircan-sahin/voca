import { useEffect, useState } from 'react';
import { Mic, MousePointerClick } from 'lucide-react';

type MicStatus = 'not-determined' | 'granted' | 'denied' | 'restricted';

interface PermissionState {
  microphone: MicStatus;
  accessibility: boolean;
}

interface Props {
  onGranted: () => void;
}

const CheckIcon = () => (
  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  </div>
);

const EmptyCircle = () => (
  <div className="w-6 h-6 rounded-full border-2 border-gray-500" />
);

export const SetupPage = ({ onGranted }: Props) => {
  const [perms, setPerms] = useState<PermissionState>({
    microphone: 'not-determined',
    accessibility: false,
  });

  const fetchStatus = async (): Promise<PermissionState> => {
    const [microphone, accessibility] = await Promise.all([
      window.electronAPI.permissions.getMicrophoneStatus(),
      window.electronAPI.permissions.getAccessibilityStatus(),
    ]);
    return { microphone, accessibility };
  };

  // Initial check — if microphone not yet asked, trigger native dialog immediately
  useEffect(() => {
    (async () => {
      const initial = await fetchStatus();
      if (initial.microphone === 'not-determined') {
        await window.electronAPI.permissions.requestMicrophone();
        const updated = await fetchStatus();
        setPerms(updated);
      } else {
        setPerms(initial);
      }
    })();
  }, []);

  // Always poll — detects changes when user comes back from System Preferences
  useEffect(() => {
    const interval = setInterval(async () => {
      const current = await fetchStatus();
      setPerms(current);
      if (current.microphone === 'granted' && current.accessibility) {
        clearInterval(interval);
        onGranted();
      }
    }, 800);
    return () => clearInterval(interval);
  }, [onGranted]);

  const handleMicrophone = async () => {
    if (perms.microphone === 'not-determined') {
      const granted = await window.electronAPI.permissions.requestMicrophone();
      if (granted) return;
    }
    window.electronAPI.permissions.openMicrophoneSettings();
  };

  const handleAccessibility = () => {
    window.electronAPI.permissions.openAccessibilitySettings();
  };

  const allGranted = perms.microphone === 'granted' && perms.accessibility;

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl border border-gray-700">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center">
            <Mic className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Header */}
        <h1 className="text-xl font-bold text-white text-center mb-2">
          Set Up Voca
        </h1>
        <p className="text-gray-400 text-sm text-center mb-6 leading-relaxed">
          The following permissions are required for the app to work properly.
        </p>

        {/* Permission items */}
        <div className="flex flex-col gap-3">
          {/* Microphone */}
          <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mic className="w-4 h-4 text-gray-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">Microphone</p>
                <p className="text-gray-400 text-xs mt-0.5 mb-2">
                  Allows microphone access for audio recording.
                </p>
                {perms.microphone !== 'granted' && (
                  <button
                    onClick={handleMicrophone}
                    className="text-blue-400 text-xs font-semibold hover:text-blue-300 transition-colors"
                  >
                    {perms.microphone === 'not-determined'
                      ? 'Grant Access'
                      : 'Open Microphone Settings →'}
                  </button>
                )}
              </div>
              <div className="flex-shrink-0 mt-0.5">
                {perms.microphone === 'granted' ? <CheckIcon /> : <EmptyCircle />}
              </div>
            </div>
          </div>

          {/* Accessibility */}
          <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MousePointerClick className="w-4 h-4 text-gray-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">Accessibility</p>
                <p className="text-gray-400 text-xs mt-0.5 mb-2">
                  Required for auto-pasting transcripts into terminals and apps.
                </p>
                {!perms.accessibility && (
                  <button
                    onClick={handleAccessibility}
                    className="text-blue-400 text-xs font-semibold hover:text-blue-300 transition-colors"
                  >
                    Open Accessibility Settings →
                  </button>
                )}
              </div>
              <div className="flex-shrink-0 mt-0.5">
                {perms.accessibility ? <CheckIcon /> : <EmptyCircle />}
              </div>
            </div>
          </div>
        </div>

        {/* Debug — kaldırılacak */}
        <p className="text-gray-600 text-xs text-center mt-4 font-mono">
          mic: {perms.microphone} | accessibility: {String(perms.accessibility)}
        </p>

        {/* Hint */}
        {!allGranted && (
          <p className="text-gray-500 text-xs text-center mt-3 leading-relaxed">
            The app will continue automatically once permissions are granted.
          </p>
        )}
      </div>
    </div>
  );
};
