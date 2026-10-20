import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { InfiniteData, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useRecorder } from '~/hooks/useRecorder';
import { useGlobalShortcut } from '~/hooks/useGlobalShortcut';
import { useRecordingOverlay } from '~/hooks/useRecordingOverlay';
import { useRecordingStore } from '~/stores/recording.store';
import { useProviderStore } from '~/stores/provider.store';
import { useLanguageStore } from '~/stores/language.store';
import { useMicrophoneStore } from '~/stores/microphone.store';
import { useTranslationStore } from '~/stores/translation.store';
import { useVocabularyStore } from '~/stores/vocabulary.store';
import { useDirectTypingStore } from '~/stores/directTyping.store';
import { useLiveTypingStore } from '~/stores/liveTyping.store';
import { transcriptService } from '~/services/transcript.service';
import { ApiError } from '~/lib/axios';
import { RETRY_TOAST_ID, showRetryToast } from '~/lib/retryToast';
import { LiveSession, openLiveSession } from '~/lib/liveTranscription';
import { ApiResponse, ITranscript, TRANSCRIPT_PAGE_SIZE } from '@voca/shared';

export const TRANSCRIPTS_QUERY_KEY = ['transcripts'];

interface TranscriptPage {
  items: ITranscript[];
  // Last id of the page as fetched; prepends and deletes in the cache don't move it
  nextCursor?: string;
}
type TranscriptPages = InfiniteData<TranscriptPage, string | undefined>;

export const useTranscription = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { deviceId } = useMicrophoneStore();
  const { isRecording, stream, start, stop, pause, cancel } = useRecorder(deviceId);
  const { isProcessing, setProcessing } = useRecordingStore();
  const { provider } = useProviderStore();
  const { language } = useLanguageStore();
  const { enabled: translationEnabled, targetLanguage, tone, numeric, planning } = useTranslationStore();
  const triggeredByShortcut = useRef(false);
  // Blocks a second toggle while start()/stop() is still awaiting (double shortcut press)
  const toggling = useRef(false);
  // A stop that arrived while the mic was still starting (quick push-to-talk release)
  const pendingStop = useRef(false);
  // Audio of the last network/5xx failure, memory only. Single slot: replaced by the next failure.
  const failedBlob = useRef<Blob | null>(null);
  const isRetry = useRef(false);
  // Live dictation in progress; its text was already typed while the user spoke
  const liveRef = useRef<LiveSession | null>(null);
  const liveTyped = useRef(false);
  const retryRef = useRef<() => void>(() => {});
  const tRef = useRef(t);
  tRef.current = t;

  useRecordingOverlay(stream, deviceId);

  const {
    data: transcriptPages,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: TRANSCRIPTS_QUERY_KEY,
    queryFn: async ({ pageParam }): Promise<TranscriptPage> => {
      const items = (await transcriptService.list(pageParam)).data ?? [];
      const full = items.length === TRANSCRIPT_PAGE_SIZE;
      return { items, nextCursor: full ? items[items.length - 1].id : undefined };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    // The cache is updated by hand (prepend/remove) and is the only copy of privacy-mode
    // transcripts, so a background refetch would drop them and re-download every loaded page.
    staleTime: Infinity,
  });

  const addToCache = (transcript: ITranscript) =>
    queryClient.setQueryData<TranscriptPages>(TRANSCRIPTS_QUERY_KEY, (old) => {
      // Not loaded yet: the cursor lets History fetch everything older from the server
      if (!old) return { pages: [{ items: [transcript], nextCursor: transcript.id }], pageParams: [undefined] };
      const [first, ...rest] = old.pages;
      return { ...old, pages: [{ ...first, items: [transcript, ...first.items] }, ...rest] };
    });

  const removeFromCache = (id: string) =>
    queryClient.setQueryData<TranscriptPages>(TRANSCRIPTS_QUERY_KEY, (old) =>
      old && { ...old, pages: old.pages.map((p) => ({ ...p, items: p.items.filter((tr) => tr.id !== id) })) }
    );

  const transcribeMutation = useMutation<ApiResponse<ITranscript>, ApiError, Blob>({
    mutationFn: async (blob) => {
      const live = liveRef.current;
      liveRef.current = null;
      if (live) {
        try {
          const { message, transcript } = await live.finish();
          liveTyped.current = true;
          return { success: true, message, data: transcript };
        } catch (err) {
          // Nothing typed yet and the failure isn't a verdict on the audio: the batch route can still deliver
          const status = err instanceof ApiError ? err.status : undefined;
          const retryable = status === undefined || status >= 500 || status === 401;
          if (live.hasTyped() || !retryable) throw err;
        }
      }
      const translateTo = translationEnabled ? targetLanguage : undefined;
      return transcriptService.transcribe(
        blob, provider, language, translateTo,
        translateTo ? tone : undefined,
        translateTo ? numeric : undefined,
        translateTo ? planning : undefined,
        useVocabularyStore.getState().words
      );
    },
    onSuccess: (res) => {
      failedBlob.current = null;
      toast.dismiss(RETRY_TOAST_ID);
      if (res.data) addToCache(res.data);
      if (res.data?.translationFailed) toast.error(t('transcript.translationFailed'));
      const text = res.data?.translatedText ?? res.data?.text;
      if (isRetry.current && text) {
        // Focus has moved on since the dictation, so copy instead of pasting into whatever is active now
        navigator.clipboard.writeText(text).then(
          () => toast.success(t('transcript.retryCopied')),
          () => toast.success(res.message)
        );
        return;
      }
      toast.success(res.message);
      if (triggeredByShortcut.current && text && !liveTyped.current) {
        window.electronAPI.pasteTranscript(text, useDirectTypingStore.getState().enabled);
      }
    },
    onError: (err, blob) => {
      // 4xx (no speech, too large, no credits) would fail again with the same audio
      if (err.status === undefined || err.status >= 500) {
        failedBlob.current = blob;
        showRetryToast(err.message, t('error.retry'), () => retryRef.current());
        return;
      }
      failedBlob.current = null;
      toast.dismiss(RETRY_TOAST_ID);
      toast.error(err.message);
    },
    onSettled: () => {
      triggeredByShortcut.current = false;
      isRetry.current = false;
      liveTyped.current = false;
      setProcessing(false);
      window.electronAPI.hideOverlay();
    },
  });

  const deleteMutation = useMutation<ApiResponse<null>, ApiError, string>({
    mutationFn: transcriptService.remove,
    onSuccess: (res, id) => {
      toast.success(res.message);
      removeFromCache(id);
    },
    onError: (err, id) => {
      // Privacy-mode transcripts only ever lived in this cache, so the server has nothing to delete
      if (err.status === 404) {
        removeFromCache(id);
        return;
      }
      toast.error(err.message);
    },
  });

  const handleDelete = useCallback(
    (id: string) => deleteMutation.mutate(id),
    [deleteMutation]
  );

  // Stores are read directly: this runs from a global shortcut, possibly ahead of a re-render.
  // Translation needs the whole sentence, so it can't be typed out as it is spoken.
  const canGoLive = () =>
    triggeredByShortcut.current &&
    window.electronAPI.platform !== 'linux' &&
    useLiveTypingStore.getState().enabled &&
    useProviderStore.getState().provider === 'deepgram' &&
    !useTranslationStore.getState().enabled;

  const startLive = () =>
    openLiveSession(
      { language: useLanguageStore.getState().language, vocabulary: useVocabularyStore.getState().words },
      // Segments are separate phrases; the space keeps the next one from gluing onto the last word
      (text, isFirst) => window.electronAPI.pasteTranscript(isFirst ? text : ` ${text}`, useDirectTypingStore.getState().enabled)
    );

  const handleToggle = useCallback(async () => {
    // Read the store directly: the closure's isProcessing can lag a render behind
    if (toggling.current) {
      if (!isRecording) pendingStop.current = true;
      return;
    }
    if (useRecordingStore.getState().isProcessing) return;
    toggling.current = true;

    try {
      if (isRecording) {
        const blob = await stop();
        if (!blob) return; // cancelled during the stop tail, cancel already hid the overlay
        if (blob.size < 2000) {
          liveRef.current?.abort();
          liveRef.current = null;
          toast.error(t('error.noMic'));
          triggeredByShortcut.current = false;
          window.electronAPI.hideOverlay();
          return;
        }
        setProcessing(true);
        window.electronAPI.setOverlayLoading(true);
        transcribeMutation.mutate(blob);
      } else {
        const live = canGoLive() ? startLive() : null;
        liveRef.current = live;
        await start(live?.send);
      }
    } catch (err) {
      liveRef.current?.abort();
      liveRef.current = null;
      // getUserMedia denied / device gone, or the recorder failed to stop
      console.warn('[Recorder]', err instanceof Error ? err.message : err);
      toast.error(t('error.noMic'));
      triggeredByShortcut.current = false;
      pendingStop.current = false;
      window.electronAPI.hideOverlay();
    } finally {
      toggling.current = false;
    }
  }, [isRecording, stop, start, setProcessing, transcribeMutation, t]);

  const handleRetry = useCallback(() => {
    const blob = failedBlob.current;
    if (!blob || toggling.current || isRecording || useRecordingStore.getState().isProcessing) return;
    isRetry.current = true;
    setProcessing(true);
    transcribeMutation.mutate(blob);
  }, [isRecording, setProcessing, transcribeMutation]);
  retryRef.current = handleRetry;

  // Run the queued stop once the recording has actually started
  useEffect(() => {
    if (!isRecording || !pendingStop.current) return;
    pendingStop.current = false;
    handleToggle();
  }, [isRecording, handleToggle]);

  const handleShortcutToggle = useCallback(() => {
    triggeredByShortcut.current = true;
    handleToggle();
  }, [handleToggle]);

  useGlobalShortcut(handleShortcutToggle);

  // Main gates the push-to-talk hold on this, so a tap-started recording isn't toggled again
  useEffect(() => {
    window.electronAPI.setRecordingState(isRecording);
  }, [isRecording]);

  useEffect(() => {
    const cleanup = window.electronAPI.onPasteFailed(() => {
      const key = window.electronAPI.platform === 'darwin' ? 'Cmd+V' : 'Ctrl+V';
      toast.error(tRef.current('error.pasteFailed', { key }), { id: 'paste-failed', duration: 6000 });
    });
    return cleanup;
  }, []);

  // The kept audio dies with the hook (logout unmounts the dashboard)
  useEffect(
    () => () => {
      failedBlob.current = null;
      liveRef.current?.abort();
      toast.dismiss(RETRY_TOAST_ID);
    },
    []
  );

  // Listen for pause from overlay (time limit)
  useEffect(() => {
    const cleanup = window.electronAPI.onPauseRecording(() => {
      if (isRecording) pause();
    });
    return cleanup;
  }, [isRecording, pause]);

  // Listen for cancel from overlay or shortcut
  useEffect(() => {
    const cleanup = window.electronAPI.onCancelRecording(() => {
      pendingStop.current = false;
      if (isRecording) {
        cancel();
        liveRef.current?.abort();
        liveRef.current = null;
        triggeredByShortcut.current = false;
        window.electronAPI.hideOverlay();
      }
    });
    return cleanup;
  }, [isRecording, cancel]);

  const transcripts = useMemo(
    () => transcriptPages?.pages.flatMap((p) => p.items) ?? [],
    [transcriptPages]
  );

  const loadMoreTranscripts = useCallback(() => {
    // fetchNextPage never rejects; a failed page leaves hasNextPage set so the next scroll retries
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    isRecording,
    isProcessing,
    handleToggle,
    handleDelete,
    transcripts,
    hasMoreTranscripts: hasNextPage,
    isLoadingMoreTranscripts: isFetchingNextPage,
    loadMoreTranscripts,
  };
};
