import { Button } from 'poyraz-ui/atoms';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '~/components/LanguageSwitcher';

export default function Navbar() {
  const { t } = useTranslation();

  return (
    <nav className="sticky top-0 z-50 border-b border-dashed border-slate-300 bg-white/80 px-4 backdrop-blur-md sm:px-6">
      <div className="mx-auto flex max-w-4xl items-center justify-between py-3">
        <a href="/" className="flex items-center gap-2">
          <img src="/voca_logo.png" alt="Voca" className="h-8 w-8" />
          <span className="text-lg font-semibold tracking-tight text-neutral-900">use<span className="text-red-600">voca</span>.dev</span>
        </a>

        <div className="flex items-center gap-3 sm:gap-6">
          <a
            href="#features"
            className="hidden text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 sm:block"
          >
            {t('navbar.features')}
          </a>
          <a
            href="#pricing"
            className="hidden text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 sm:block"
          >
            {t('navbar.pricing')}
          </a>
          <a
            href="#faq"
            className="hidden text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 sm:block"
          >
            {t('navbar.faq')}
          </a>
          <LanguageSwitcher />
          <a href="#download" className="hidden sm:block">
            <Button size="sm">
              <Download className="mr-1.5 h-4 w-4" />
              {t('navbar.download')}
            </Button>
          </a>
        </div>
      </div>
    </nav>
  );
}
