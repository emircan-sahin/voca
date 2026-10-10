import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ITranscript } from '@voca/shared';

// The main process has no i18n, so it gets the tray labels from here
export const useTrayLabels = () => {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    window.electronAPI.tray.setLabels({
      open: t('tray.open'),
      copy: t('tray.copyLast'),
      quit: t('tray.quit'),
    });
    // t changes together with the language
  }, [t, i18n.language]);
};

// Newest first. Same text the shortcut pastes (translation wins when present).
export const useTrayLastTranscript = (transcripts: ITranscript[]) => {
  const latest = transcripts[0];
  const text = latest ? (latest.translatedText ?? latest.text) : '';

  useEffect(() => {
    window.electronAPI.tray.setLastTranscript(text);
  }, [text]);

  // Logout unmounts the dashboard: don't leave the last transcript in the tray menu
  useEffect(() => () => window.electronAPI.tray.setLastTranscript(''), []);
};
