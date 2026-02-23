import { IAuthResponse } from '@voca/shared';
import { api, ApiError } from '~/lib/axios';

const POLL_INTERVAL = 2000;
const POLL_MAX_ATTEMPTS = 60;

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const authService = {
  async pollForAuth(state: string): Promise<IAuthResponse | null> {
    for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
      await wait(POLL_INTERVAL);
      try {
        const res = await api.get<IAuthResponse>(`/auth/poll?state=${state}`);
        if (res.data) return res.data;
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
      }
    }
    return null;
  },
};
