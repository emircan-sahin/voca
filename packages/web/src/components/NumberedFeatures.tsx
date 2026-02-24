import { Card, CardContent } from 'poyraz-ui/atoms';
import { Mic, Languages, Keyboard, Code } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Feature {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    number: '01',
    icon: Keyboard,
    title: 'One Shortcut, Done',
    description:
      'Press a key, speak, press again. The transcript is copied and pasted right where your cursor was — no switching apps, no extra steps.',
  },
  {
    number: '02',
    icon: Mic,
    title: 'Choose Your STT Engine',
    description:
      'Switch between Deepgram Nova-3 and Groq Whisper with a single click. 35+ languages supported for voice recognition with automatic language detection.',
  },
  {
    number: '03',
    icon: Languages,
    title: 'Translate Into 100+ Languages',
    description:
      'Context-aware translation with tone control. Pick formal, casual, or developer mode — technical terms stay in English, jargon gets auto-corrected.',
  },
  {
    number: '04',
    icon: Code,
    title: 'Open Source & Private',
    description:
      'Fully open source under MIT. Audio is processed through your own API keys — no data collection, no analytics, no third-party servers storing your recordings.',
  },
];

export default function NumberedFeatures() {
  return (
    <section className="border-t border-dashed border-slate-300 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 text-center sm:mb-16">
          <h2 className="mb-4 text-2xl font-bold text-neutral-900 sm:text-3xl">
            Everything you need, nothing you don&apos;t.
          </h2>
          <p className="mx-auto max-w-xl text-neutral-500">
            From recording to polished, translated text — Voca handles the
            entire pipeline on your desktop.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {features.map((f) => (
            <Card key={f.number}>
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-4">
                  <span className="text-2xl font-bold text-slate-200">{f.number}</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
                    <f.icon className="h-5 w-5 text-neutral-600" />
                  </div>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-neutral-900">{f.title}</h3>
                <p className="text-sm leading-relaxed text-neutral-500">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
