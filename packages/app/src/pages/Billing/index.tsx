import { useState, useEffect, useRef } from 'react';
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

const FAQ_ITEMS = [
  {
    question: 'Is Voca free?',
    answer: [
      'Every plan starts with a 3-day free trial — fully featured, no restrictions. Pick any plan, try it risk-free, and cancel anytime.',
      'After the trial, plans start at just $3/month. No hidden fees, no surprise charges. What you see is what you pay.',
      'Unlike competitors who charge ~$8/month plus extra API key costs, Voca includes everything in one simple subscription.',
    ],
  },
  {
    question: 'Can I cancel anytime?',
    answer: [
      "Yes. Cancel whenever you want — your current period stays active, and the next month simply won't renew.",
      "No cancellation fees, no hidden terms, no awkward retention flows. One click and you're done.",
      'Everything is open source. You can verify our billing, our code, and our promises — nothing is hidden.',
    ],
  },
  {
    question: 'What makes Voca different?',
    answer: [
      'Background noise cancellation built for real-world environments — especially useful for developers in noisy spaces.',
      'AI that recognizes function names, code terms, and technical jargon, then transcribes them correctly instead of guessing.',
      'Smart auto-paste: the corrected transcript lands right where your cursor was. No copy-paste, no switching apps.',
      "AI doesn't just transcribe — it improves your writing style, fixes grammar, and makes your text cleaner than what you actually said.",
    ],
  },
  {
    question: 'What is Developer Mode?',
    answer: [
      "Developer Mode is a tone setting built specifically for software engineers. When enabled, Voca's AI recognizes code terms, function names, library names, and technical jargon — and transcribes them correctly instead of treating them as regular words.",
      'Say "reakt use state hook" and it writes "React useState hook". Say "nahbar component" and it writes "navbar component".',
      "Combined with background noise cancellation, it's designed for developers who dictate code comments, documentation, or messages while working in real-world environments.",
    ],
  },
  {
    question: 'Which languages are supported?',
    answer: [
      '35+ languages for speech recognition through Deepgram and Groq engines.',
      '100+ languages for AI-powered translation with tone control — formal, casual, or developer mode.',
      'Developer mode automatically recognizes code terms and technical jargon, keeping them in English while translating the rest naturally.',
    ],
  },
  {
    question: 'Where is my data stored?',
    answer: [
      'Your data is processed on our servers with a privacy-first approach. Voca is fully open source — you can inspect every line of code yourself.',
      "If you don't want anything stored on our servers, simply toggle it off in Settings. Your recordings and transcripts won't be saved — it's entirely your choice.",
      'No tracking, no analytics, no selling data. Period.',
    ],
  },
  {
    question: 'Does it work offline?',
    answer: [
      'Voca requires an internet connection. Your audio is sent to our servers where we process it for the best possible quality at the lowest cost.',
      'Our cloud pipeline includes background noise cancellation, AI correction, code-aware transcription, and smart translation — delivering faster, more accurate results than any local solution could.',
    ],
  },
];

// ── Helpers ─────────────────────────────────────────────────────

function periodLabel(periodEnd: string | null, status: SubscriptionStatus | null, cancelScheduled: boolean): string | null {
  if (!periodEnd) return null;
  const target = dayjs(periodEnd);
  if (target.isBefore(dayjs())) return 'Expired';
  if (cancelScheduled) return `Active until ${target.format('MMM D')}`;
  if (status === 'trialing') return `Trial ends ${target.fromNow()}`;
  if (status === 'canceled') return `Expired`;
  return `Renews ${target.fromNow()}`;
}

const STATUS_LABELS: Record<SubscriptionStatus, { label: string; color: string }> = {
  trialing: { label: 'Trial', color: '#3b82f6' },
  active: { label: 'Active', color: '#22c55e' },
  canceled: { label: 'Canceled', color: '#ef4444' },
};

function useTick(intervalMs: number) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}


// ── Component ───────────────────────────────────────────────────

export const BillingView = () => {
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
      const res = await api.post<{ url: string; updated?: boolean }>('/billing/checkout', { plan });

      if (res.data?.updated) {
        toast.success('Plan updated');
        setTimeout(refreshUser, 2000);
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

  const period = periodLabel(user?.currentPeriodEnd ?? null, subStatus, cancelScheduled);
  const statusInfo = subStatus ? STATUS_LABELS[subStatus] : null;

  return (
    <div className="p-6 space-y-6">
      <Card variant="bordered" className="border-solid border-[#e5e5e5]">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-[#171717] mb-1">Remaining Credits</h3>
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
                {cancelScheduled ? 'Canceling' : statusInfo.label}
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

          let buttonText = 'Subscribe';
          let buttonDisabled = loading !== null;

          if (!showCancel) {
            if (isDowngrade) {
              buttonText = 'Current: ' + (user?.plan === 'max' ? 'Max' : 'Pro');
              buttonDisabled = true;
            } else if (canUpgrade && !isCurrentPlan) {
              buttonText = 'Upgrade';
            } else if (isLive && !isCurrentPlan) {
              // Trial on other plan → can't switch
              buttonText = 'Upgrade';
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
                  <p className="text-xs text-[#a3a3a3] mt-0.5">3-day free trial</p>
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
                    {loading === 'cancel' ? 'Cancelling...' : 'Cancel Subscription'}
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full mt-auto"
                    disabled={buttonDisabled}
                    onClick={() => handleCheckout(key)}
                  >
                    {loading === 'checkout' ? 'Opening...' : buttonText}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="pt-2">
        <h3 className="text-sm font-medium text-[#171717] mb-3">Frequently Asked Questions</h3>
        <Accordion type="single" collapsible>
          {FAQ_ITEMS.map((item, i) => (
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
          Can't find your question?{' '}
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
