import { useTranslation } from 'react-i18next';
import vocaLogo from '~/assets/voca_logo.png';

interface SplashScreenProps {
  retryIn: number | null;
}

export const SplashScreen = ({ retryIn }: SplashScreenProps) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center gap-6">
      <img src={vocaLogo} alt="Voca" className="w-16 h-16 rounded-full" />

      <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />

      <div className="text-sm text-[#737373] text-center">
        <p>{t('splash.checking')}</p>
        {retryIn !== null && (
          <p className="mt-1">{t('splash.retrying', { seconds: retryIn })}</p>
        )}
      </div>
    </div>
  );
};
