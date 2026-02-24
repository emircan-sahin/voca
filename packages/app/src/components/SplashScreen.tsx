import vocaLogo from '~/assets/voca_logo.png';

interface SplashScreenProps {
  retryIn: number | null;
}

export const SplashScreen = ({ retryIn }: SplashScreenProps) => (
  <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center gap-6">
    <img src={vocaLogo} alt="Voca" className="w-16 h-16 rounded-full" />

    <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />

    <p className="text-sm text-[#737373]">
      {retryIn !== null
        ? `Checking for updates... Retrying in ${retryIn}s`
        : 'Checking for updates...'}
    </p>
  </div>
);
