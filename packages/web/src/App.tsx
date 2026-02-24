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

function isHomePage() {
  const path = window.location.pathname;
  return path === '/' || path === '/index.html';
}

export default function App() {
  const [is404] = useState(() => !isHomePage());

  useEffect(() => {
    if (is404) {
      document.title = '404 — Page not found | usevoca.dev';
    }
  }, [is404]);

  if (is404) {
    return <NotFound />;
  }

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
