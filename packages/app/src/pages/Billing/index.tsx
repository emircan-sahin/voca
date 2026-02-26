import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Linkedin, Mail } from 'lucide-react';
import { Card, CardContent, Button } from 'poyraz-ui/atoms';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from 'poyraz-ui/molecules';
import { initializePaddle, CheckoutEventNames } from '@paddle/paddle-js';
import type { Paddle, Environments } from '@paddle/paddle-js';
import toast from 'react-hot-toast';
import { BillingPlan, IUser, SubscriptionStatus, SOCIALS, PLAN_RANK } from '@voca/shared';
import dayjs from '~/lib/dayjs';
import { api, ApiError } from '~/lib/axios';
import { useAuthStore, refreshUser } from '~/stores/auth.store';

// ── Helpers ─────────────────────────────────────────────────────

function useTick(intervalMs: number) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}


// ── Component ───────────────────────────────────────────────────

export const BillingView = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState<'checkout' | 'cancel' | null>(null);
  const paddleRef = useRef<Paddle | null>(null);
  useTick(60_000);

  // Refresh user data on mount so billing state is always fresh
  useEffect(() => { refreshUser(); }, []);

  useEffect(() => {
    let cancelled = false;

    api.get<{ clientToken: string; sandbox: boolean }>('/billing/config').then(async (res) => {
      if (cancelled || !res.data) return;

      const paddle = await initializePaddle({
        token: res.data.clientToken,
        environment: (res.data.sandbox ? 'sandbox' : 'production') as Environments,
        eventCallback: (event) => {
          if (event.name === CheckoutEventNames.CHECKOUT_COMPLETED) {
            setTimeout(refreshUser, 5_000);
            setTimeout(refreshUser, 15_000);
          }
        },
      });

      if (!cancelled && paddle) paddleRef.current = paddle;
    }).catch(() => {});

    return () => { cancelled = true; };
  }, []);

  const handleCheckout = async (plan: BillingPlan) => {
    const paddle = paddleRef.current;
    if (!paddle || !user) return;

    setLoading('checkout');
    try {
      const res = await api.post<{ url: string; updated?: boolean; resumed?: boolean }>('/billing/checkout', { plan });

      if (res.data?.resumed) {
        toast.success(t('billing.resumed'));
        await refreshUser();
        return;
      }

      if (res.data?.updated) {
        toast.success(t('billing.upgraded'));
        await refreshUser();
        return;
      }

      const txnId = res.data?.url
        ? new URL(res.data.url).searchParams.get('_ptxn')
        : null;
      if (txnId) {
        paddle.Checkout.open({ transactionId: txnId });
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to open checkout');
    } finally {
      setLoading(null);
    }
  };

  const handleCancel = async () => {
    setLoading('cancel');
    try {
      const res = await api.post<IUser>('/billing/cancel');
      if (res.data) useAuthStore.setState({ user: res.data });
      toast.success('Subscription will cancel at period end');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to cancel subscription');
    } finally {
      setLoading(null);
    }
  };

  // ── Derived state ───────────────────────────────────────────
  const subStatus = user?.subscriptionStatus ?? null;
  const cancelScheduled = user?.cancelScheduled ?? false;

  // "Live" = trialing or active AND not scheduled for cancel
  const isLive = (subStatus === 'trialing' || subStatus === 'active') && !cancelScheduled;
  const canCancel = isLive;
  const canUpgrade = subStatus === 'active' && !cancelScheduled;

  const period = periodLabel(t, user?.currentPeriodEnd ?? null, subStatus, cancelScheduled);
  const statusInfo = subStatus ? STATUS_LABELS(t)[subStatus] : null;

  const plans = buildPlans(t);
  const faqItems: { question: string; answer: string[] }[] = t('billing.faqItems', { returnObjects: true });

  return (
    <div className="p-6 space-y-6">
      <Card variant="bordered" className="border-solid border-[#e5e5e5]">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-[#171717] mb-1">{t('billing.remainingCredits')}</h3>
            <p className="text-2xl font-bold text-[#171717]">${(user?.credits ?? 0).toFixed(2)}</p>
            {period && (
              <p className="text-xs text-[#737373] mt-1">{period}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {statusInfo && user?.plan && (
              <span
                className="inline-block text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded"
                style={{ backgroundColor: cancelScheduled ? '#ef4444' : statusInfo.color, color: '#fff' }}
              >
                {cancelScheduled ? t('billing.canceling') : statusInfo.label}
              </span>
            )}
            {user?.plan && (
              <span
                className="inline-block text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded"
                style={{
                  backgroundColor: user.plan === 'max' ? '#dc2626' : '#f59e0b',
                  color: '#fff',
                }}
              >
                {user.plan}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {plans.map(({ key, label, description, price, features }) => {
          const isCurrentPlan = user?.plan === key;

          const showCancel = isCurrentPlan && canCancel;
          const isDowngrade = isLive && !isCurrentPlan && user?.plan && PLAN_RANK[key] < PLAN_RANK[user.plan];

          let buttonText = t('billing.subscribe');
          let buttonDisabled = loading !== null;

          if (!showCancel) {
            if (isDowngrade) {
              buttonText = t('billing.current', { plan: user?.plan === 'max' ? 'Max' : 'Pro' });
              buttonDisabled = true;
            } else if (canUpgrade && !isCurrentPlan) {
              buttonText = t('billing.upgrade');
            } else if (isLive && !isCurrentPlan) {
              buttonText = t('billing.upgrade');
              buttonDisabled = true;
            }
          }

          return (
            <Card
              key={key}
              variant="bordered"
              className={`border-solid ${isCurrentPlan && isLive ? 'border-[#171717] border-2' : 'border-[#e5e5e5]'}`}
            >
              <CardContent className="p-5 flex flex-col gap-4">
                <div className="text-center">
                  <h3 className="text-base font-semibold text-[#171717]">{label}</h3>
                  <p className="text-xs text-[#737373] mt-0.5">{description}</p>
                  <p className="text-3xl font-bold text-[#171717] mt-2">${price}</p>
                  <p className="text-xs text-[#a3a3a3] mt-0.5">{t('billing.freeTrial')}</p>
                </div>

                <ul className="space-y-2">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[#525252]">
                      <Check size={14} className="mt-0.5 shrink-0 text-[#22c55e]" />
                      {f}
                    </li>
                  ))}
                </ul>

                {showCancel ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-auto"
                    disabled={loading !== null}
                    onClick={handleCancel}
                  >
                    {loading === 'cancel' ? t('billing.cancelling') : t('billing.cancelSubscription')}
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full mt-auto"
                    disabled={buttonDisabled}
                    onClick={() => handleCheckout(key)}
                  >
                    {loading === 'checkout' ? t('billing.opening') : buttonText}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="pt-2">
        <h3 className="text-sm font-medium text-[#171717] mb-3">{t('billing.faq')}</h3>
        <Accordion type="single" collapsible>
          {faqItems.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-sm leading-relaxed text-[#737373]">
                  {item.answer.map((line, j) => (
                    <p key={j}>{line}</p>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <p className="mt-6 text-center text-xs text-[#a3a3a3]">
          {t('billing.faqCta')}{' '}
          <a
            href={SOCIALS.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-[#171717] underline underline-offset-2 transition-colors hover:text-red-600"
          >
            <Linkedin className="h-3 w-3" />
            LinkedIn
          </a>
          {' · '}
          <a
            href={`mailto:${SOCIALS.email}`}
            className="inline-flex items-center gap-1 font-medium text-[#171717] underline underline-offset-2 transition-colors hover:text-red-600"
          >
            <Mail className="h-3 w-3" />
            {SOCIALS.email}
          </a>
        </p>
      </div>
    </div>
  );
};

// ── Static helpers (use `t` at call time) ────────────────────

function periodLabel(
  t: (key: string, opts?: Record<string, string>) => string,
  periodEnd: string | null,
  status: SubscriptionStatus | null,
  cancelScheduled: boolean,
): string | null {
  if (!periodEnd) return null;
  const target = dayjs(periodEnd);
  if (target.isBefore(dayjs())) return t('billing.expired');
  if (cancelScheduled) return t('billing.activeUntil', { date: target.format('MMM D') });
  if (status === 'trialing') return t('billing.trialEnds', { time: target.fromNow() });
  if (status === 'canceled') return t('billing.expired');
  return t('billing.renews', { time: target.fromNow() });
}

function STATUS_LABELS(t: (key: string) => string): Record<SubscriptionStatus, { label: string; color: string }> {
  return {
    trialing: { label: t('billing.trial'), color: '#3b82f6' },
    active: { label: t('billing.active'), color: '#22c55e' },
    canceled: { label: t('billing.canceled'), color: '#ef4444' },
  };
}

function buildPlans(t: (key: string) => string) {
  return [
    {
      key: 'pro' as BillingPlan,
      label: 'Pro',
      description: t('billing.pro.description'),
      price: 3,
      features: [
        t('billing.features.proCredits'),
        t('billing.features.stt'),
        t('billing.features.tone'),
        t('billing.features.addons'),
        t('billing.features.proUpload'),
      ],
    },
    {
      key: 'max' as BillingPlan,
      label: 'Max',
      description: t('billing.max.description'),
      price: 10,
      features: [
        t('billing.features.maxCredits'),
        t('billing.features.stt'),
        t('billing.features.tone'),
        t('billing.features.addons'),
        t('billing.features.maxUpload'),
      ],
    },
  ];
}
