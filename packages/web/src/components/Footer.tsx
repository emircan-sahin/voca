import { Github } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const GITHUB_URL = 'https://github.com/emircan-sahin/voca';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-dashed border-slate-300 px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 sm:grid sm:grid-cols-3 sm:items-center sm:gap-0">
        {/* Left — logo */}
        <div className="flex items-center gap-2">
          <img src="/voca_logo.png" alt="Voca" className="h-8 w-8" />
          <span className="text-lg font-semibold tracking-tight text-neutral-900">use<span className="text-red-600">voca</span>.dev</span>
        </div>

        {/* Center — links */}
        <div className="flex items-center justify-center gap-6 text-sm text-neutral-500">
          <a href="#features" className="transition-colors hover:text-neutral-900">
            {t('footer.features')}
          </a>
          <a href="#pricing" className="transition-colors hover:text-neutral-900">
            {t('footer.pricing')}
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-neutral-900"
          >
            <Github className="h-4 w-4" />
          </a>
        </div>

        {/* Right — copyright */}
        <p className="text-center text-xs text-neutral-400 sm:text-right">
          {t('footer.copyright', { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
