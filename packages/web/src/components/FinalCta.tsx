import { Button } from 'poyraz-ui/atoms';
import { Apple, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function FinalCta() {
  const { t } = useTranslation();

  return (
    <section className="border-t border-dashed border-slate-300 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="mb-4 text-2xl font-bold text-neutral-900 sm:text-3xl">
          {t('finalCta.heading')}
        </h2>
        <p className="mx-auto mb-10 max-w-xl text-neutral-500">
          {t('finalCta.description')}
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Button variant="outline" className="w-full border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 sm:w-80">
            <Monitor className="mr-2 h-5 w-5" />
            {t('finalCta.downloadWindows')}
          </Button>
          <Button className="w-full sm:w-80">
            <Apple className="mr-2 h-5 w-5" />
            {t('finalCta.downloadMac')}
          </Button>
        </div>
      </div>
    </section>
  );
}
