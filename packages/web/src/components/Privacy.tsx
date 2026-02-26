import { Trans, useTranslation } from 'react-i18next';
import Navbar from '~/components/Navbar';
import Footer from '~/components/Footer';

const linkClass = 'text-red-600 underline underline-offset-2 hover:text-red-700';

const boldComponent = { b: <strong /> };

const paddlePrivacyComponents = {
  b: <strong />,
  paddlePrivacy: <a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener noreferrer" className={linkClass} />,
};

const googlePrivacyComponents = {
  b: <strong />,
  googlePrivacy: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className={linkClass} />,
};

const emailComponents = {
  email: <a href="mailto:contact@usevoca.dev" className={linkClass} />,
};

export default function Privacy() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-neutral-900">{t('privacy.title')}</h1>
          <p className="mb-12 text-sm text-neutral-400">{t('privacy.lastUpdated')}</p>

          <div className="space-y-10 text-neutral-700 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-neutral-900 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
            <section>
              <h2>{t('privacy.intro.heading')}</h2>
              <p>{t('privacy.intro.content')}</p>
            </section>

            <section>
              <h2>{t('privacy.collection.heading')}</h2>
              <p><Trans i18nKey="privacy.collection.account" components={boldComponent} /></p>
              <p className="mt-3"><Trans i18nKey="privacy.collection.transcripts" components={boldComponent} /></p>
              <p className="mt-3"><Trans i18nKey="privacy.collection.billing" components={boldComponent} /></p>
            </section>

            <section>
              <h2>{t('privacy.audio.heading')}</h2>
              <ul>
                {(t('privacy.audio.items', { returnObjects: true }) as string[]).map((_, i) => (
                  <li key={i}>
                    <Trans i18nKey={`privacy.audio.items.${i}`} components={boldComponent} />
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2>{t('privacy.privacyMode.heading')}</h2>
              <p>{t('privacy.privacyMode.content')}</p>
            </section>

            <section>
              <h2>{t('privacy.thirdParty.heading')}</h2>
              <p>{t('privacy.thirdParty.intro')}</p>
              <ul>
                <li><Trans i18nKey="privacy.thirdParty.paddle" components={paddlePrivacyComponents} /></li>
                <li><Trans i18nKey="privacy.thirdParty.google" components={googlePrivacyComponents} /></li>
              </ul>
            </section>

            <section>
              <h2>{t('privacy.noCollect.heading')}</h2>
              <ul>
                {(t('privacy.noCollect.items', { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2>{t('privacy.retention.heading')}</h2>
              <ul>
                {(t('privacy.retention.items', { returnObjects: true }) as string[]).map((_, i) => (
                  <li key={i}>
                    <Trans i18nKey={`privacy.retention.items.${i}`} components={boldComponent} />
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2>{t('privacy.rights.heading')}</h2>
              <p>{t('privacy.rights.intro')}</p>
              <ul>
                {(t('privacy.rights.items', { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2>{t('privacy.children.heading')}</h2>
              <p>{t('privacy.children.content')}</p>
            </section>

            <section>
              <h2>{t('privacy.changes.heading')}</h2>
              <p>{t('privacy.changes.content')}</p>
            </section>

            <section>
              <h2>{t('privacy.contact.heading')}</h2>
              <p><Trans i18nKey="privacy.contact.content" components={emailComponents} /></p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
