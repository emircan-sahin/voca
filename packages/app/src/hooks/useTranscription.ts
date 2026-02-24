import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useRecorder } from '~/hooks/useRecorder';
import { useGlobalShortcut } from '~/hooks/useGlobalShortcut';
import { useRecordingOverlay } from '~/hooks/useRecordingOverlay';
import { useRecordingStore } from '~/stores/recording.store';
import { useProviderStore } from '~/stores/provider.store';
import { useLanguageStore } from '~/stores/language.store';
import { useMicrophoneStore } from '~/stores/microphone.store';
import { useTranslationStore } from '~/stores/translation.store';
import { transcriptService } from '~/services/transcript.service';
import { ApiError } from '~/lib/axios';
import { ApiResponse, ITranscript } from '@voca/shared';

export const useTranscription = () => {
  const queryClient = useQueryClient();
  const { deviceId } = useMicrophoneStore();
  const { isRecording, stream, start, stop, cancel } = useRecorder(deviceId);
  const { isProcessing, setProcessing } = useRecordingStore();
  const { provider } = useProviderStore();
  const { language } = useLanguageStore();
  const { enabled: translationEnabled, targetLanguage, tone, numeric, planning } = useTranslationStore();
  const triggeredByShortcut = useRef(false);

  useRecordingOverlay(stream, deviceId);

  const { data: transcriptsResponse } = useQuery<ApiResponse<ITranscript[]>>({
    queryKey: ['transcripts'],
    queryFn: transcriptService.getAll,
  });

  const transcribeMutation = useMutation<ApiResponse<ITranscript>, ApiError, Blob>({
    mutationFn: (blob) => {
      const translateTo = translationEnabled ? targetLanguage : undefined;
      return transcriptService.transcribe(
        blob, provider, language, translateTo,
        translateTo ? tone : undefined,
        translateTo ? numeric : undefined,
        translateTo ? planning : undefined
      );
    },
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['transcripts'] });
      if (triggeredByShortcut.current && res.data?.text) {
        window.electronAPI.pasteTranscript(res.data.translatedText ?? res.data.text);
        triggeredByShortcut.current = false;
      }
    },
    onError: (err) => {
      toast.error(err.message);
      triggeredByShortcut.current = false;
    },
    onSettled: () => {
      setProcessing(false);
      window.electronAPI.hideOverlay();
    },
  });

  const deleteMutation = useMutation<ApiResponse<null>, ApiError, string>({
    mutationFn: transcriptService.remove,
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['transcripts'] });
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleDelete = useCallback(
    (id: string) => deleteMutation.mutate(id),
    [deleteMutation]
  );

  const handleToggle = useCallback(async () => {
    if (isProcessing) return;

    if (isRecording) {
      const blob = await stop();
      if (blob.size < 2000) {
        toast.error('No microphone audio detected. Check if your mic is on.');
        triggeredByShortcut.current = false;
        window.electronAPI.hideOverlay();
        return;
      }
      setProcessing(true);
      window.electronAPI.setOverlayLoading(true);
      transcribeMutation.mutate(blob);
    } else {
      await start();
    }
  }, [isProcessing, isRecording, stop, start, setProcessing, transcribeMutation]);

  const handleShortcutToggle = useCallback(() => {
    triggeredByShortcut.current = true;
    handleToggle();
  }, [handleToggle]);

  useGlobalShortcut(handleShortcutToggle);

  // Listen for cancel from overlay or shortcut
  useEffect(() => {
    const cleanup = window.electronAPI.onCancelRecording(() => {
      if (isRecording) {
        cancel();
        triggeredByShortcut.current = false;
        window.electronAPI.hideOverlay();
      }
    });
    return cleanup;
  }, [isRecording, cancel]);

  const transcripts = transcriptsResponse?.data ?? [];

  return {
    isRecording,
    isProcessing,
    handleToggle,
    handleDelete,
    transcripts,
  };
};
