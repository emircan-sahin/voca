import { Button } from 'poyraz-ui/atoms';
import { Apple, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DOWNLOADS } from '@voca/shared';

export default function FinalCta() {
  const { t } = useTranslation();

  return (
    <section id="download" className="border-t border-dashed border-slate-300 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="mb-4 text-2xl font-bold text-neutral-900 sm:text-3xl">
          {t('finalCta.heading')}
        </h2>
        <p className="mx-auto mb-10 max-w-xl text-neutral-500">
          {t('finalCta.description')}
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <a href={DOWNLOADS.windows} className="w-full sm:w-80">
            <Button variant="outline" className="w-full border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800">
              <Monitor className="mr-2 h-5 w-5" />
              {t('finalCta.downloadWindows')}
            </Button>
          </a>
          <a href={DOWNLOADS.mac} className="w-full sm:w-80">
            <Button className="w-full">
              <Apple className="mr-2 h-5 w-5" />
              {t('finalCta.downloadMac')}
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
