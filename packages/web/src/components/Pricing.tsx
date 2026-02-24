import { Button, Card, CardContent } from 'poyraz-ui/atoms';
import { Check, Download } from 'lucide-react';
import {
  PLAN_CREDITS,
  PLAN_UPLOAD_LIMIT,
  type BillingPlan,
} from '@voca/shared';

interface PlanConfig {
  key: BillingPlan;
  label: string;
  badge: string;
}

const plans: PlanConfig[] = [
  { key: 'pro', label: 'Pro', badge: 'bg-red-50 text-red-600 border-red-200' },
  { key: 'max', label: 'Max', badge: 'bg-red-50 text-red-600 border-red-200' },
];

function formatMB(bytes: number) {
  return `${bytes / (1024 * 1024)} MB`;
}

function getFeatures(key: BillingPlan, limit: number): string[] {
  return [
    'Deepgram Nova-3 & Groq Whisper',
    'AI translation into 100+ languages',
    'Developer & Personal tone modes',
    'Numeric & Planning add-ons',
    `Up to ${formatMB(limit)} per recording`,
  ];
}

export default function Pricing() {
  return (
    <section id="pricing" className="border-t border-dashed border-slate-300 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-neutral-900">
            Affordable plans, all features included.
          </h2>
          <p className="mx-auto max-w-lg text-neutral-500">
            Both plans unlock every feature. No hidden fees, no surprises —
            pick the one that fits your usage and start transcribing.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {plans.map((plan) => {
            const credits = PLAN_CREDITS[plan.key];
            const limit = PLAN_UPLOAD_LIMIT[plan.key];
            const feats = getFeatures(plan.key, limit);

            return (
              <Card key={plan.key}>
                <CardContent className="p-8">
                  <div className="mb-6">
                    <span
                      className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${plan.badge}`}
                    >
                      {plan.label}
                    </span>
                  </div>

                  <div className="mb-2 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-red-600">
                      ${credits}
                    </span>
                    <span className="text-neutral-400">/mo</span>
                  </div>

                  <p className="mb-8 text-sm text-neutral-500">
                    ${credits} in credits included every month
                  </p>

                  <ul className="mb-8 space-y-3">
                    {feats.map((feat) => (
                      <li key={feat} className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                          <Check className="h-3 w-3 text-green-600" />
                        </div>
                        <span className="text-sm text-neutral-600">{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <Button className="w-full">
                    <Download className="mr-1.5 h-4 w-4" />
                    Download to get {plan.label}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
