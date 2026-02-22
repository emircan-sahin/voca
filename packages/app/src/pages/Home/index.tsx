import { useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { RecordButton } from '~/components/RecordButton';
import { TranscriptCard } from '~/components/TranscriptCard';
import { ShortcutsPanel } from '~/components/ShortcutsPanel';
import { ProviderSelect } from '~/components/ProviderSelect';
import { LanguageSelect } from '~/components/LanguageSelect';
import { MicrophoneSelect } from '~/components/MicrophoneSelect';
import { useRecorder } from '~/hooks/useRecorder';
import { useGlobalShortcut } from '~/hooks/useGlobalShortcut';
import { useRecordingOverlay } from '~/hooks/useRecordingOverlay';
import { useRecordingStore } from '~/stores/recording.store';
import { useProviderStore } from '~/stores/provider.store';
import { useLanguageStore } from '~/stores/language.store';
import { useMicrophoneStore } from '~/stores/microphone.store';
import { transcriptService } from '~/services/transcript.service';
import { ApiResponse, ITranscript } from '@voca/shared';

export const HomePage = () => {
  const queryClient = useQueryClient();
  const { deviceId } = useMicrophoneStore();
  const { isRecording, stream, start, stop } = useRecorder(deviceId);
  const { isProcessing, setProcessing } = useRecordingStore();
  const { provider } = useProviderStore();
  const { language } = useLanguageStore();
  const triggeredByShortcut = useRef(false);

  useRecordingOverlay(stream);

  const { data: transcriptsResponse } = useQuery<ApiResponse<ITranscript[]>>({
    queryKey: ['transcripts'],
    queryFn: transcriptService.getAll,
  });

  const transcribeMutation = useMutation<ApiResponse<ITranscript>, { message: string }, Blob>({
    mutationFn: (blob) => transcriptService.transcribe(blob, provider, language),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['transcripts'] });
      if (triggeredByShortcut.current && res.data?.text) {
        window.electronAPI.pasteTranscript(res.data.text);
        triggeredByShortcut.current = false;
      }
    },
    onError: (err) => {
      toast.error(err.message);
      triggeredByShortcut.current = false;
    },
    onSettled: () => setProcessing(false),
  });

  const deleteMutation = useMutation<ApiResponse<null>, { message: string }, string>({
    mutationFn: transcriptService.remove,
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['transcripts'] });
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleToggle = useCallback(async () => {
    if (isProcessing) return;

    if (isRecording) {
      const blob = await stop();
      if (blob.size < 2000) {
        toast.error('No microphone audio detected. Check if your mic is on.');
        triggeredByShortcut.current = false;
        return;
      }
      setProcessing(true);
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

  const transcripts = transcriptsResponse?.data ?? [];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <ShortcutsPanel />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Voca</h1>
          <p className="text-gray-400 text-sm mt-1">Record voice, transcribe to text</p>
        </header>

        <div className="flex flex-col items-center gap-4 mb-10">
          <div className="flex items-center gap-2">
            <ProviderSelect />
            <LanguageSelect />
            <MicrophoneSelect />
          </div>
          <RecordButton
            isRecording={isRecording}
            isProcessing={isProcessing}
            onClick={handleToggle}
          />
          <p className="text-gray-400 text-sm">
            {isProcessing
              ? 'Processing...'
              : isRecording
              ? 'Click to stop recording'
              : 'Click to start recording'}
          </p>
        </div>

        <section>
          <h2 className="text-gray-300 text-sm font-medium mb-3">
            Transcripts ({transcripts.length})
          </h2>
          {transcripts.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-8">
              No transcripts yet. Start recording!
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {transcripts.map((t: ITranscript) => (
                <TranscriptCard
                  key={t.id}
                  transcript={t}
                  onDelete={(id: string) => deleteMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
