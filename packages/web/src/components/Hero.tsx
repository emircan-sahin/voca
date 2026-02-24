import { Button } from 'poyraz-ui/atoms';
import { Github, Apple, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const GITHUB_URL = 'https://github.com/emircan-sahin/voca';

export default function Hero() {
  const { t } = useTranslation();

  return (
    <section className="px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-24">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-4 inline-block rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-neutral-500">
          {t('hero.badge')}
        </div>

        <h1 className="mb-6 text-3xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-5xl md:text-6xl">
          {t('hero.headingTop')}
          <br />
          <span className="text-red-600">{t('hero.headingBottom')}</span>
        </h1>

        <p className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-neutral-500 sm:text-lg">
          {t('hero.description')}
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Button variant="outline" className="w-full border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 sm:w-80">
            <Monitor className="mr-2 h-5 w-5" />
            {t('hero.downloadWindows')}
          </Button>
          <Button className="w-full sm:w-80">
            <Apple className="mr-2 h-5 w-5" />
            {t('hero.downloadMac')}
          </Button>
        </div>
        <div className="mt-3 flex justify-center">
          <Button variant="outline" className="w-full sm:w-80">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
            >
              <Github className="h-5 w-5" />
              GitHub
            </a>
          </Button>
        </div>

        {/* App screenshot */}
        <div className="mt-16 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-4 py-2.5">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
            </div>
          </div>
          <img
            src="/app_screenshot.png"
            alt="Voca App"
            className="w-full"
          />
        </div>
      </div>
    </section>
  );
}
