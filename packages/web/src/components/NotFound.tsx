import { Button } from 'poyraz-ui/atoms';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useLocalizedPath } from '~/i18n/routing';

export default function NotFound() {
  const { t } = useTranslation();
  const lp = useLocalizedPath();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <img src="/voca_logo_128.webp" alt="Voca" width={64} height={64} className="mb-8 h-16 w-16 opacity-40" />
      <h1 className="mb-2 text-6xl font-bold text-neutral-900">{t('notFound.title')}</h1>
      <p className="mb-8 text-lg text-neutral-500">
        {t('notFound.message')}
      </p>
      <Button asChild>
        <Link to={lp('/')}>
          <ArrowLeft className="mr-2 h-5 w-5" />
          {t('notFound.backHome')}
        </Link>
      </Button>
    </div>
  );
}
