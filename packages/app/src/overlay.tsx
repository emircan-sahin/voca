import '~/i18n/config';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RecordingOverlay } from '~/components/RecordingOverlay';
import './styles/overlay.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <RecordingOverlay />
);
