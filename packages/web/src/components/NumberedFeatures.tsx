import { Card, CardContent } from 'poyraz-ui/atoms';
import { Mic, Languages, Keyboard, Code } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ICONS: LucideIcon[] = [Keyboard, Mic, Languages, Code];
const NUMBERS = ['01', '02', '03', '04'] as const;

export default function NumberedFeatures() {
  const { t } = useTranslation();
  const features = t('numberedFeatures.features', { returnObjects: true }) as { title: string; description: string }[];

  return (
    <section className="border-t border-dashed border-slate-300 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 text-center sm:mb-16">
          <h2 className="mb-4 text-2xl font-bold text-neutral-900 sm:text-3xl">
            {t('numberedFeatures.heading')}
          </h2>
          <p className="mx-auto max-w-xl text-neutral-500">
            {t('numberedFeatures.description')}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {features.map((f, i) => {
            const Icon = ICONS[i];
            return (
              <Card key={NUMBERS[i]}>
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center gap-4">
                    <span className="text-2xl font-bold text-slate-200">{NUMBERS[i]}</span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
                      <Icon className="h-5 w-5 text-neutral-600" />
                    </div>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-neutral-900">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-neutral-500">{f.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
