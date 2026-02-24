import { useState, useEffect } from 'react';
import { Check, Linkedin, Mail } from 'lucide-react';
import { Card, CardContent, Button } from 'poyraz-ui/atoms';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from 'poyraz-ui/molecules';
import { BillingPlan, PLAN_RANK, IUser, SOCIALS } from '@voca/shared';
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
