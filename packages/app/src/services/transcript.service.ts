import { api } from '~/lib/axios';
import { ApiResponse, ITranscript, TRANSCRIPT_PAGE_SIZE } from '@voca/shared';
import { Provider } from '~/stores/provider.store';

export const transcriptService = {
  async transcribe(
    audioBlob: Blob,
    provider: Provider,
    language: string,
    translateTo?: string,
    tone?: string,
    numeric?: boolean,
    planning?: boolean,
    vocabulary: string[] = []
  ): Promise<ApiResponse<ITranscript>> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const params = new URLSearchParams({ provider, language });
    if (translateTo) params.set('translateTo', translateTo);
    if (tone) params.set('tone', tone);
    if (numeric) params.set('numeric', 'true');
    if (planning) params.set('planning', 'true');
    // One JSON param (not repeated keys) so phrases can contain commas
    if (vocabulary.length > 0) params.set('vocabulary', JSON.stringify(vocabulary));

    // A network failure keeps the audio for a retry toast; the splash screen would unmount the
    // dashboard and drop it. Up to 5 min of audio plus translation needs more than the 30s default.
    return api.post<ITranscript>(`/transcripts?${params.toString()}`, formData, {
      skipOfflineSignal: true,
      timeout: 120_000,
    });
  },

  async list(before?: string): Promise<ApiResponse<ITranscript[]>> {
    return api.get<ITranscript[]>('/transcripts', {
      params: { limit: TRANSCRIPT_PAGE_SIZE, ...(before && { before }) },
    });
  },

  async remove(id: string): Promise<ApiResponse<null>> {
    return api.delete<null>(`/transcripts/${id}`);
  },
};
