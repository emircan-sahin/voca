import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PromoBanner from '~/components/PromoBanner';
import Navbar from '~/components/Navbar';
import Hero from '~/components/Hero';
import FeatureHighlight from '~/components/FeatureHighlight';
import NumberedFeatures from '~/components/NumberedFeatures';
import Pricing from '~/components/Pricing';
import Faq from '~/components/Faq';
import FinalCta from '~/components/FinalCta';
import Footer from '~/components/Footer';
import NotFound from '~/components/NotFound';
import Terms from '~/components/Terms';
import Privacy from '~/components/Privacy';
// Refund page disabled: Voca is free, no payments to refund
// import Refund from '~/components/Refund';
import { LOCALES } from '~/i18n';
import { LOCALE_META } from '~/i18n/locales';
import { SITE_URL, localizePath, parseLocalePath } from '~/i18n/routing';

const ROBOTS_INDEX = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

function Homepage() {
  return (
    <div className="min-h-screen">
      <PromoBanner />
      <Navbar />
      <Hero />
      <FeatureHighlight />
      <NumberedFeatures />
      <Pricing />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}

type PageConfig = { component: () => JSX.Element; metaKey: string };

// Unprefixed paths; each exists under every locale prefix too. Keep public/sitemap.xml in sync.
const PAGES: Record<string, PageConfig> = {
  '/': { component: Homepage, metaKey: 'home' },
  '/terms': { component: Terms, metaKey: 'terms' },
  '/privacy': { component: Privacy, metaKey: 'privacy' },
  // '/refund': { component: Refund, metaKey: 'refund' },
};

function setMeta(attr: string, key: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function appendHead(tag: 'link' | 'meta', attrs: Record<string, string>) {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  document.head.appendChild(el);
}

export default function App() {
  const { pathname, hash, state } = useLocation();
  const { t, i18n } = useTranslation();
  const { locale, path } = parseLocalePath(pathname);
  // Paths always start with "/", so they can't hit Object.prototype keys
  const page: PageConfig | undefined = PAGES[path];

  // A prefixed URL decides the language (covers back/forward between locales).
  // Unprefixed English URLs keep the detected language for humans; crawlers get English.
  useEffect(() => {
    if (locale !== 'en' && i18n.resolvedLanguage !== locale) i18n.changeLanguage(locale);
  }, [locale, i18n]);

  useEffect(() => {
    const title = t(page ? `meta.${page.metaKey}.title` : 'meta.notFound.title');
    const description = t(`meta.${page?.metaKey ?? 'home'}.description`);
    const canonical = page ? SITE_URL + localizePath(path, locale) : SITE_URL + pathname;

    document.title = title;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:locale', LOCALE_META[locale].ogLocale);
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    // The SPA fallback serves unknown paths with 200, so keep soft 404s out of the index
    setMeta('name', 'robots', page ? ROBOTS_INDEX : 'noindex');

    let canonicalEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonical);

    document.querySelectorAll('link[rel="alternate"][hreflang], meta[property="og:locale:alternate"]').forEach((el) => el.remove());
    for (const l of LOCALES) {
      if (page) appendHead('link', { rel: 'alternate', hreflang: l, href: SITE_URL + localizePath(path, l) });
      if (l !== locale) appendHead('meta', { property: 'og:locale:alternate', content: LOCALE_META[l].ogLocale });
    }
    if (page) appendHead('link', { rel: 'alternate', hreflang: 'x-default', href: SITE_URL + path });
  }, [pathname, path, locale, page, t]);

  useEffect(() => {
    // Switching language swaps the URL prefix but should leave the reader where they were
    if ((state as { keepScroll?: boolean } | null)?.keepScroll) return;
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash, state]);

  const Page = page?.component ?? NotFound;
  return <Page />;
}
