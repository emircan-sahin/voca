import { useState, useEffect } from 'react';
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

type Page = 'home' | 'terms' | 'privacy' | 'refund' | '404';

function resolvePage(): Page {
  const path = window.location.pathname;
  if (path === '/' || path === '/index.html') return 'home';
  if (path === '/terms') return 'terms';
  if (path === '/privacy') return 'privacy';
  if (path === '/refund') return 'refund';
  return '404';
}

const PAGE_TITLES: Record<Page, string> = {
  home: 'Voca — AI Voice-to-Text',
  terms: 'Terms of Service — Voca',
  privacy: 'Privacy Policy — Voca',
  refund: 'Refund Policy — Voca',
  '404': '404 — Page not found | usevoca.dev',
};

export default function App() {
  const [page] = useState(resolvePage);

  useEffect(() => {
    document.title = PAGE_TITLES[page];
  }, [page]);

  if (page === 'terms') return <Terms />;
  if (page === 'privacy') return <Privacy />;
  if (page === 'refund') return <Refund />;
  if (page === '404') return <NotFound />;

  return (
    <div className="min-h-screen">
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
