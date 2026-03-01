import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, MousePointerClick } from 'lucide-react';
import { Card, CardContent, Button } from 'poyraz-ui/atoms';

type MicStatus = 'not-determined' | 'granted' | 'denied' | 'restricted';

interface PermissionState {
  microphone: MicStatus;
  accessibility: boolean;
}

interface Props {
  onGranted: () => void;
}

const CheckIcon = () => (
  <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center">
    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  </div>
);

const EmptyCircle = () => (
  <div className="w-6 h-6 rounded-full border-2 border-dashed border-slate-300" />
);

export const SetupPage = ({ onGranted }: Props) => {
  const { t } = useTranslation();
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
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
      <Card variant="bordered" className="w-full max-w-sm">
        <CardContent className="p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center">
              <Mic className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Header */}
          <h1 className="text-xl font-bold text-[#171717] text-center mb-2">
            {t('setup.title')}
          </h1>
          <p className="text-[#737373] text-sm text-center mb-6 leading-relaxed">
            {t('setup.subtitle')}
          </p>

          {/* Permission items */}
          <div className="flex flex-col gap-3">
            {/* Microphone */}
            <div className="border border-dashed border-slate-300 p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-[#fafafa] border border-dashed border-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Mic className="w-4 h-4 text-[#737373]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#171717] text-sm font-medium">{t('setup.microphone')}</p>
                  <p className="text-[#737373] text-xs mt-0.5 mb-2">
                    {t('setup.microphoneDesc')}
                  </p>
                  {perms.microphone !== 'granted' && (
                    <Button
                      variant="link"
                      className="text-red-600 text-xs font-semibold p-0 h-auto"
                      onClick={handleMicrophone}
                    >
                      {perms.microphone === 'not-determined'
                        ? t('setup.grantAccess')
                        : t('setup.openMicSettings')}
                    </Button>
                  )}
                </div>
                <div className="flex-shrink-0 mt-0.5">
                  {perms.microphone === 'granted' ? <CheckIcon /> : <EmptyCircle />}
                </div>
              </div>
            </div>

            {/* Accessibility */}
            <div className="border border-dashed border-slate-300 p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-[#fafafa] border border-dashed border-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MousePointerClick className="w-4 h-4 text-[#737373]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#171717] text-sm font-medium">{t('setup.accessibility')}</p>
                  <p className="text-[#737373] text-xs mt-0.5 mb-2">
                    {t('setup.accessibilityDesc')}
                  </p>
                  {!perms.accessibility && (
                    <Button
                      variant="link"
                      className="text-red-600 text-xs font-semibold p-0 h-auto"
                      onClick={handleAccessibility}
                    >
                      {t('setup.openAccessibilitySettings')}
                    </Button>
                  )}
                </div>
                <div className="flex-shrink-0 mt-0.5">
                  {perms.accessibility ? <CheckIcon /> : <EmptyCircle />}
                </div>
              </div>
            </div>
          </div>

          {/* Hint */}
          {!allGranted && (
            <p className="text-[#737373] text-xs text-center mt-4 leading-relaxed">
              {t('setup.hint')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
