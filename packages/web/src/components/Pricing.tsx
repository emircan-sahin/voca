import { Button, Card, CardContent } from 'poyraz-ui/atoms';
import { Check, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Pricing() {
  const { t } = useTranslation();
  const features = t('pricing.features', { returnObjects: true }) as string[];

  return (
    <section id="pricing" className="border-t border-dashed border-slate-300 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-neutral-900">
            {t('pricing.heading')}
          </h2>
          <p className="mx-auto max-w-lg text-neutral-500">
            {t('pricing.description')}
          </p>
        </div>

        <Card className="mx-auto max-w-md">
          <CardContent className="p-8">
            <div className="mb-6">
              <span className="inline-block rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                {t('pricing.badge')}
              </span>
            </div>

            <div className="mb-2 text-5xl font-bold text-red-600">$0</div>

            <p className="mb-8 text-sm text-neutral-500">{t('pricing.tagline')}</p>

            <ul className="mb-8 space-y-3">
              {features.map((feat, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                    <Check className="h-3 w-3 text-green-600" />
                  </div>
                  <span className="text-sm text-neutral-600">{feat}</span>
                </li>
              ))}
            </ul>

            <Button asChild className="w-full">
              <a href="#download">
                <Download className="mr-1.5 h-4 w-4" />
                {t('pricing.downloadToGet')}
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
