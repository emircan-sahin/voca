import { Check } from 'lucide-react';
import CorrectionDemo from '~/components/CorrectionDemo';

const highlights = [
  'Translate transcripts into 100+ languages in one click',
  'Developer tone keeps technical terms in English',
  'Numeric add-on converts spoken numbers to digits',
  'Planning add-on turns dictated steps into clean lists',
];

export default function FeatureHighlight() {
  return (
    <section id="features" className="border-t border-dashed border-slate-300 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-2 md:gap-16">
        {/* Left — animated demo */}
        <CorrectionDemo />

        {/* Right — description */}
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-red-600">
            AI-Powered Accuracy
          </p>
          <h2 className="mb-4 text-3xl font-bold text-neutral-900">
            Your words, but better.
          </h2>
          <p className="mb-8 text-neutral-500">
            Voca doesn&apos;t just transcribe — it understands context.
            Mispronunciations and grammar mistakes are corrected, then the
            result is auto-pasted wherever you were typing. Developer tone
            turns &ldquo;reakt&rdquo; into React and &ldquo;nahbar&rdquo;
            into navbar.
          </p>

          <ul className="space-y-3">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-3">
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
