import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import vocaLogo from '~/assets/voca_logo.png';

const SPLASH_MESSAGES = ['splash.connecting', 'splash.checking'] as const;
const ROTATE_INTERVAL = 3000;
const FADE_DURATION = 200;

interface SplashScreenProps {
  retryIn: number | null;
}

export const SplashScreen = ({ retryIn }: SplashScreenProps) => {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % SPLASH_MESSAGES.length);
        setVisible(true);
      }, FADE_DURATION);
    }, ROTATE_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center gap-6">
      <img src={vocaLogo} alt="Voca" className="w-16 h-16 rounded-full" />

      <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />

      <div className="text-sm text-[#737373] text-center">
        <p
          className="transition-opacity duration-200"
          style={{ opacity: visible ? 1 : 0 }}
        >
          {t(SPLASH_MESSAGES[index])}
        </p>
        {retryIn !== null && (
          <p className="mt-1">{t('splash.retrying', { seconds: retryIn })}</p>
        )}
      </div>
    </div>
  );
};
