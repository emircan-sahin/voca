import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Card, CardContent, Button } from 'poyraz-ui/atoms';
import { BillingPlan, PLAN_RANK, IUser } from '@voca/shared';
import dayjs from '~/lib/dayjs';
import { api } from '~/lib/axios';
import { useAuthStore } from '~/stores/auth.store';

const plans: {
  key: BillingPlan;
  label: string;
  description: string;
  price: number;
  features: string[];
}[] = [
  {
    key: 'pro',
    label: 'Pro',
    description: 'For personal use',
    price: 3,
    features: [
      '$3/mo free credits included',
      'Groq & Deepgram transcription',
      'AI-enhanced tone & translation',
      'Numeric & Planning add-ons',
      'Up to 10 MB audio uploads',
    ],
  },
  {
    key: 'max',
    label: 'Max',
    description: 'For heavy usage',
    price: 10,
    features: [
      '$10/mo free credits included',
      'Groq & Deepgram transcription',
      'AI-enhanced tone & translation',
      'Numeric & Planning add-ons',
      'Up to 25 MB audio uploads',
    ],
  },
];

function expiryLabel(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const target = dayjs(expiresAt);
  if (target.isBefore(dayjs())) return 'Expired';
  return `Expires ${target.fromNow()}`;
}

function useTick(intervalMs: number) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

export const BillingView = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState<'activate' | 'cancel' | null>(null);
  useTick(60_000);

  const handleActivate = async (plan: BillingPlan) => {
    setLoading('activate');
    try {
      const res = await api.post<IUser>('/billing/activate', { plan });
      if (res.data) useAuthStore.setState({ user: res.data });
    } finally {
      setLoading(null);
    }
  };

  const handleCancel = async () => {
    setLoading('cancel');
    try {
      const res = await api.post<IUser>('/billing/cancel');
      if (res.data) useAuthStore.setState({ user: res.data });
    } finally {
      setLoading(null);
    }
  };

  const expiry = expiryLabel(user?.planExpiresAt ?? null);
  const hasActivePlan = !!user?.plan;

  const isUpgrade = (plan: BillingPlan) =>
    hasActivePlan && PLAN_RANK[plan] > PLAN_RANK[user!.plan!];

  return (
    <div className="p-6 space-y-6">
      <Card variant="bordered" className="border-solid border-[#e5e5e5]">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-[#171717] mb-1">Remaining Credits</h3>
            <p className="text-2xl font-bold text-[#171717]">${(user?.credits ?? 0).toFixed(2)}</p>
            {hasActivePlan && expiry && (
              <p className="text-xs text-[#737373] mt-1">{expiry}</p>
            )}
          </div>
          {hasActivePlan && (
            <span
              className="inline-block text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded"
              style={{
                backgroundColor: user!.plan === 'max' ? '#dc2626' : '#f59e0b',
                color: '#fff',
              }}
            >
              {user!.plan}
            </span>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {plans.map(({ key, label, description, price, features }) => {
          const active = user?.plan === key;
          return (
            <Card
              key={key}
              variant="bordered"
              className={`border-solid ${active ? 'border-[#171717] border-2' : 'border-[#e5e5e5]'}`}
            >
              <CardContent className="p-5 flex flex-col gap-4">
                <div className="text-center">
                  <h3 className="text-base font-semibold text-[#171717]">{label}</h3>
                  <p className="text-xs text-[#737373] mt-0.5">{description}</p>
                  <p className="text-3xl font-bold text-[#171717] mt-2">${price}</p>
                </div>

                <ul className="space-y-2">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[#525252]">
                      <Check size={14} className="mt-0.5 shrink-0 text-[#22c55e]" />
                      {f}
                    </li>
                  ))}
                </ul>

                {active ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-auto"
                    disabled={loading !== null}
                    onClick={handleCancel}
                  >
                    {loading === 'cancel' ? 'Cancelling...' : 'Cancel Renewal'}
                  </Button>
                ) : isUpgrade(key) ? (
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full mt-auto"
                    disabled={loading !== null}
                    onClick={() => handleActivate(key)}
                  >
                    {loading === 'activate' ? 'Upgrading...' : 'Upgrade'}
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full mt-auto"
                    disabled={loading !== null || hasActivePlan}
                    onClick={() => handleActivate(key)}
                  >
                    {loading === 'activate' ? 'Activating...' : 'Activate'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
