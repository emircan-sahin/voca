import axiosInstance from '~/lib/axios';
import { ApiResponse, ITranscript } from '@voca/shared';
import { Provider } from '~/stores/provider.store';

export const transcriptService = {
  async transcribe(audioBlob: Blob, provider: Provider, language: string): Promise<ApiResponse<ITranscript>> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    const res = await axiosInstance.post<ApiResponse<ITranscript>>(
      `/transcripts?provider=${provider}&language=${language}`,
      formData
    );
    return res.data;
  },

  async getAll(): Promise<ApiResponse<ITranscript[]>> {
    const res = await axiosInstance.get<ApiResponse<ITranscript[]>>('/transcripts');
    return res.data;
  },

  async remove(id: string): Promise<ApiResponse<null>> {
    const res = await axiosInstance.delete<ApiResponse<null>>(`/transcripts/${id}`);
    return res.data;
  },
};
