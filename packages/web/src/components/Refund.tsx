import { Trans, useTranslation } from 'react-i18next';
import Navbar from '~/components/Navbar';
import Footer from '~/components/Footer';

const linkClass = 'text-red-600 underline underline-offset-2 hover:text-red-700';

const emailComponents = {
  email: <a href="mailto:contact@usevoca.dev" className={linkClass} />,
};

const paddleComponents = {
  paddleHelp: <a href="https://www.paddle.com/help/manage/your-customers" target="_blank" rel="noopener noreferrer" className={linkClass} />,
};

export default function Refund() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-neutral-900">{t('refund.title')}</h1>
          <p className="mb-12 text-sm text-neutral-400">{t('refund.lastUpdated')}</p>

          <div className="space-y-10 text-neutral-700 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-neutral-900 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
            <section>
              <h2>{t('refund.trial.heading')}</h2>
              <p>{t('refund.trial.content')}</p>
            </section>

            <section>
              <h2>{t('refund.cancellation.heading')}</h2>
              <p>{t('refund.cancellation.content')}</p>
            </section>

            <section>
              <h2>{t('refund.refunds.heading')}</h2>
              <p><Trans i18nKey="refund.refunds.content" components={paddleComponents} /></p>
            </section>

            <section>
              <h2>{t('refund.credits.heading')}</h2>
              <p>{t('refund.credits.content')}</p>
            </section>

            <section>
              <h2>{t('refund.contact.heading')}</h2>
              <p><Trans i18nKey="refund.contact.content" components={emailComponents} /></p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
