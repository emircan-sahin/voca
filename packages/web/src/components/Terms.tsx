import { Trans, useTranslation } from 'react-i18next';
import Navbar from '~/components/Navbar';
import Footer from '~/components/Footer';

const linkClass = 'text-red-600 underline underline-offset-2 hover:text-red-700';

const billingComponents = {
  b: <strong />,
  paddleTerms: <a href="https://www.paddle.com/legal/terms" target="_blank" rel="noopener noreferrer" className={linkClass} />,
};

const boldComponent = { b: <strong /> };

const emailComponents = {
  email: <a href="mailto:contact@usevoca.dev" className={linkClass} />,
};

export default function Terms() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-neutral-900">{t('terms.title')}</h1>
          <p className="mb-12 text-sm text-neutral-400">{t('terms.lastUpdated')}</p>

          <div className="space-y-10 text-neutral-700 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-neutral-900 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
            <section>
              <h2>{t('terms.agreement.heading')}</h2>
              <p>{t('terms.agreement.content')}</p>
            </section>

            <section>
              <h2>{t('terms.service.heading')}</h2>
              <p>{t('terms.service.content')}</p>
            </section>

            <section>
              <h2>{t('terms.accounts.heading')}</h2>
              <p>{t('terms.accounts.content')}</p>
            </section>

            <section>
              <h2>{t('terms.billing.heading')}</h2>
              <ul>
                {(t('terms.billing.items', { returnObjects: true }) as string[]).map((_, i) => (
                  <li key={i}>
                    <Trans i18nKey={`terms.billing.items.${i}`} components={billingComponents} />
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2>{t('terms.use.heading')}</h2>
              <p>{t('terms.use.intro')}</p>
              <ul>
                {(t('terms.use.items', { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2>{t('terms.ip.heading')}</h2>
              <p><Trans i18nKey="terms.ip.content" components={boldComponent} /></p>
            </section>

            <section>
              <h2>{t('terms.warranties.heading')}</h2>
              <p>{t('terms.warranties.content')}</p>
            </section>

            <section>
              <h2>{t('terms.liability.heading')}</h2>
              <p>{t('terms.liability.content')}</p>
            </section>

            <section>
              <h2>{t('terms.termination.heading')}</h2>
              <p>{t('terms.termination.content')}</p>
            </section>

            <section>
              <h2>{t('terms.changes.heading')}</h2>
              <p>{t('terms.changes.content')}</p>
            </section>

            <section>
              <h2>{t('terms.contact.heading')}</h2>
              <p><Trans i18nKey="terms.contact.content" components={emailComponents} /></p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
