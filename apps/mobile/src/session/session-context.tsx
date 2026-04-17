import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from 'react';

export interface SessionUser {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  profileStatus: string;
}

export interface SessionState {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

interface SessionContextValue {
  session: SessionState | null;
  setSession: (session: SessionState) => void;
  updateSessionUser: (user: SessionUser) => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSessionState] = useState<SessionState | null>(null);

  const value: SessionContextValue = {
    session,
    setSession: (nextSession) => {
      setSessionState(nextSession);
    },
    updateSessionUser: (user) => {
      setSessionState((currentSession) =>
        currentSession
          ? {
              ...currentSession,
              user,
            }
          : currentSession,
      );
    },
    clearSession: () => {
      setSessionState(null);
    },
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }

  return context;
}
