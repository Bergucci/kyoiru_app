import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { useApi } from '../lib/use-api';
import { useSession } from './session-context';

export interface EntitlementResponse {
  planName: string;
  status: string;
  currentPeriodExpiresAt: string | null;
  gracePeriodExpiresAt: string | null;
  isActiveForFeatures: boolean;
}

interface EntitlementContextValue {
  entitlement: EntitlementResponse | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const EntitlementContext = createContext<EntitlementContextValue | null>(null);

export function EntitlementProvider({ children }: PropsWithChildren) {
  const { session } = useSession();
  const { request } = useApi();
  const [entitlement, setEntitlement] = useState<EntitlementResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!session) {
      setEntitlement(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await request<EntitlementResponse>('/billing/entitlement');
      setEntitlement(response);
    } catch {
      setEntitlement(null);
    } finally {
      setLoading(false);
    }
  }, [request, session]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <EntitlementContext.Provider value={{ entitlement, loading, refresh }}>
      {children}
    </EntitlementContext.Provider>
  );
}

export function useEntitlement() {
  const context = useContext(EntitlementContext);

  if (!context) {
    throw new Error('useEntitlement must be used within EntitlementProvider');
  }

  return context;
}
