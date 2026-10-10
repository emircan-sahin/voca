import { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '~/App';
import '~/i18n/config';
import '~/styles/globals.css';

// Suspense covers the first fetch of a lazily loaded locale
ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Suspense fallback={null}>
      <App />
    </Suspense>
  </BrowserRouter>,
);
