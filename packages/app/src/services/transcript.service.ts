import { api } from '~/lib/axios';
import { ApiResponse, ITranscript } from '@voca/shared';
import { Provider } from '~/stores/provider.store';

export const transcriptService = {
  async transcribe(
    audioBlob: Blob,
    provider: Provider,
    language: string,
    translateTo?: string,
    tone?: string,
    numeric?: boolean,
    planning?: boolean
  ): Promise<ApiResponse<ITranscript>> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const params = new URLSearchParams({ provider, language });
    if (translateTo) params.set('translateTo', translateTo);
    if (tone) params.set('tone', tone);
    if (numeric) params.set('numeric', 'true');
    if (planning) params.set('planning', 'true');

    return api.post<ITranscript>(`/transcripts?${params.toString()}`, formData);
  },

  async getAll(): Promise<ApiResponse<ITranscript[]>> {
    return api.get<ITranscript[]>('/transcripts');
  },

  async remove(id: string): Promise<ApiResponse<null>> {
    return api.delete<null>(`/transcripts/${id}`);
  },
};
