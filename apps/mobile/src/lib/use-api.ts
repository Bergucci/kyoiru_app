import { useSession } from '../session/session-context';
import { ApiError, apiRequest } from './api';
import type { ApiRequestOptions } from './api';

type RequestOptions = Omit<ApiRequestOptions, 'token'>;

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export function useApi() {
  const { session, setSession, clearSession } = useSession();

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (!session) throw new Error('Not authenticated');

    try {
      return await apiRequest<T>(path, { ...options, token: session.accessToken });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;

      try {
        const refreshed = await apiRequest<RefreshResponse>('/auth/refresh', {
          method: 'POST',
          body: { refreshToken: session.refreshToken },
        });
        setSession({ ...session, ...refreshed });
        return await apiRequest<T>(path, { ...options, token: refreshed.accessToken });
      } catch {
        clearSession();
        throw error;
      }
    }
  }

  return { request };
}
