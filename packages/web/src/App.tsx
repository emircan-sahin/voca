import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
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

function Homepage() {
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

export default function App() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    document.title = PAGE_TITLES[pathname] ?? '404 — Page not found | usevoca.dev';

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
