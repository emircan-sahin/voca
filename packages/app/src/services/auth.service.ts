import { IAuthResponse } from '@voca/shared';
import { api, ApiError } from '~/lib/axios';

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const authService = {
  async pollForAuth(state: string): Promise<IAuthResponse | null> {
    for (let i = 0; i < 60; i++) {
      await wait(2000);
      try {
        const res = await api.get<IAuthResponse>(`/auth/poll?state=${state}`);
        if (res.data) return res.data;
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
      }
    }
    return null;
  },

  refresh: (refreshToken: string) =>
    api.post<IAuthResponse>('/auth/refresh', { refreshToken }),
};
