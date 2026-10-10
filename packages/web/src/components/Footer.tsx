import { Github, Linkedin, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { SOCIALS } from '@voca/shared/constants/config';
import { useLocalizedPath } from '~/i18n/routing';

const socialLinks = [
  { href: SOCIALS.linkedin, icon: Linkedin, label: 'LinkedIn' },
  { href: `mailto:${SOCIALS.email}`, icon: Mail, label: 'Email' },
  { href: SOCIALS.github, icon: Github, label: 'GitHub' },
] as const;

export default function Footer() {
  const { t } = useTranslation();
  const lp = useLocalizedPath();

  return (
    <footer className="border-t border-dashed border-slate-300 px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 sm:grid sm:grid-cols-3 sm:items-center sm:gap-0">
        {/* Left — logo */}
        <Link to={lp('/')} className="flex items-center gap-2">
          <img src="/voca_logo_128.webp" alt="Voca" width={32} height={32} className="h-8 w-8" />
          <span className="text-lg font-semibold tracking-tight text-neutral-900">use<span className="text-red-600">voca</span>.dev</span>
        </Link>

        {/* Center — nav + social */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-6 text-sm text-neutral-500">
            <Link to={lp('/terms')} className="transition-colors hover:text-neutral-900">
              {t('footer.terms')}
            </Link>
            <Link to={lp('/privacy')} className="transition-colors hover:text-neutral-900">
              {t('footer.privacy')}
            </Link>
            {/* Refund link hidden: Voca is free, no payments to refund */}
            {/* <Link to={lp('/refund')} className="transition-colors hover:text-neutral-900">
              {t('footer.refund')}
            </Link> */}
          </div>
          <div className="flex items-center gap-4 text-neutral-500">
            {socialLinks.map(({ href, icon: Icon, label }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith('mailto:') ? undefined : '_blank'}
                rel={href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                aria-label={label}
                className="transition-colors hover:text-neutral-900"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Right — copyright */}
        <p className="text-center text-xs text-neutral-500 sm:text-right">
          {t('footer.copyright', { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
