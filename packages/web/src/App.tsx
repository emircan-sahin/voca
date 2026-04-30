import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
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
import Refund from '~/components/Refund';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Voca — AI Voice-to-Text',
  '/terms': 'Terms of Service — Voca',
  '/privacy': 'Privacy Policy — Voca',
  '/refund': 'Refund Policy — Voca',
};

const PAGE_DESCRIPTIONS: Record<string, string> = {
  '/': 'Open-source desktop app that transcribes your voice with AI-powered corrections and translates into 100+ languages. Press a shortcut, speak, and the result is auto-pasted where your cursor was. Free credits included.',
  '/terms': 'Terms of Service for Voca — usage terms, acceptable use, and conditions for using the Voca desktop application.',
  '/privacy': 'Privacy Policy for Voca — how we handle your data, what we collect, and your privacy rights.',
  '/refund': 'Refund Policy for Voca — free month offer, cancellation terms, and how to request a refund.',
};

const PAGE_CANONICALS: Record<string, string> = {
  '/': 'https://usevoca.dev',
  '/terms': 'https://usevoca.dev/terms',
  '/privacy': 'https://usevoca.dev/privacy',
  '/refund': 'https://usevoca.dev/refund',
};

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

export default function App() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    const title = PAGE_TITLES[pathname] ?? '404 — Page not found | usevoca.dev';
    const description = PAGE_DESCRIPTIONS[pathname] ?? PAGE_DESCRIPTIONS['/'];
    const canonical = PAGE_CANONICALS[pathname] ?? `https://usevoca.dev${pathname}`;

    document.title = title;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('name', 'description', description);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', canonical);
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:url', canonical);

    let canonicalEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonical);

    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/refund" element={<Refund />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
