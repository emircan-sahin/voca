import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from 'poyraz-ui/molecules';
import { Linkedin, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SOCIALS } from '@voca/shared';

interface FaqItem {
  question: string;
  answer: string[];
}

export default function Faq() {
  const { t } = useTranslation();
  const items = t('faq.items', { returnObjects: true }) as FaqItem[];

  return (
    <section
      id="faq"
      className="border-t border-dashed border-slate-300 px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-neutral-900">
            {t('faq.heading')}
          </h2>
          <p className="mx-auto max-w-lg text-neutral-500">
            {t('faq.description')}
          </p>
        </div>

        <Accordion type="single" collapsible>
          {items.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm leading-relaxed text-neutral-600">
                  {item.answer.map((line, j) => (
                    <p key={j}>{line}</p>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <p className="mt-10 text-center text-sm text-neutral-500">
          {t('faq.cta')}{' '}
          <a
            href={SOCIALS.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-neutral-900 underline underline-offset-2 transition-colors hover:text-red-600"
          >
            <Linkedin className="h-3.5 w-3.5" />
            LinkedIn
          </a>
          {' · '}
          <a
            href={`mailto:${SOCIALS.email}`}
            className="inline-flex items-center gap-1 font-medium text-neutral-900 underline underline-offset-2 transition-colors hover:text-red-600"
          >
            <Mail className="h-3.5 w-3.5" />
            {SOCIALS.email}
          </a>
        </p>
      </div>
    </section>
  );
}
