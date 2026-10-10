import { Button } from 'poyraz-ui/atoms';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useLocalizedPath } from '~/i18n/routing';
import LanguageSwitcher from '~/components/LanguageSwitcher';

export default function Navbar() {
  const { t } = useTranslation();
  const lp = useLocalizedPath();

  return (
    <nav className="sticky top-0 z-50 border-b border-dashed border-slate-300 bg-white/80 px-4 backdrop-blur-md sm:px-6">
      <div className="mx-auto flex max-w-4xl items-center justify-between py-3">
        <Link to={lp('/')} className="flex items-center gap-2">
          <img src="/voca_logo_128.webp" alt="Voca" width={32} height={32} className="h-8 w-8" />
          <span className="text-lg font-semibold tracking-tight text-neutral-900">use<span className="text-red-600">voca</span>.dev</span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            to={lp('/#features')}
            className="hidden text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 sm:block"
          >
            {t('navbar.features')}
          </Link>
          <Link
            to={lp('/#pricing')}
            className="hidden text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 sm:block"
          >
            {t('navbar.pricing')}
          </Link>
          <Link
            to={lp('/#faq')}
            className="hidden text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 sm:block"
          >
            {t('navbar.faq')}
          </Link>
          <LanguageSwitcher />
          <Button size="sm" asChild className="hidden lg:inline-flex">
            <Link to={lp('/#download')}>
              <Download className="mr-1.5 h-4 w-4" />
              {t('navbar.download')}
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
