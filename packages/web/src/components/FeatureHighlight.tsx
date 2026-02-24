import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CorrectionDemo from '~/components/CorrectionDemo';

export default function FeatureHighlight() {
  const { t } = useTranslation();
  const highlights = t('featureHighlight.highlights', { returnObjects: true }) as string[];

  return (
    <section id="features" className="border-t border-dashed border-slate-300 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-2 md:gap-16">
        {/* Left — animated demo */}
        <CorrectionDemo />

        {/* Right — description */}
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-red-600">
            {t('featureHighlight.label')}
          </p>
          <h2 className="mb-4 text-3xl font-bold text-neutral-900">
            {t('featureHighlight.heading')}
          </h2>
          <p className="mb-8 text-neutral-500">
            {t('featureHighlight.description')}
          </p>

          <ul className="space-y-3">
            {highlights.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <Check className="h-3 w-3 text-green-600" />
                </div>
                <span className="text-sm text-neutral-600">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
