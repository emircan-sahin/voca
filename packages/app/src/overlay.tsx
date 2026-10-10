import i18n from '~/i18n/config';
import ReactDOM from 'react-dom/client';
import { RecordingOverlay } from '~/components/RecordingOverlay';
import './styles/overlay.css';

// Own window, own i18n instance: follow the app language instead of the OS one
const lang = new URLSearchParams(window.location.search).get('lang');
if (lang) i18n.changeLanguage(lang);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <RecordingOverlay />
);
