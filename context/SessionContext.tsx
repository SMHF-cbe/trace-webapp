import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "route_sync_session";

export type RouteSession = {
  route_id: number;
  route_name: string;
};

type SessionContextValue = {
  session: RouteSession | null;
  ready: boolean;
  setSession: (route_id: number, route_name: string) => Promise<void>;
  clearSession: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<RouteSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as RouteSession;
            if (parsed?.route_id != null) setSessionState(parsed);
          } catch {
            /* ignore */
          }
        }
      })
      .finally(() => setReady(true));
  }, []);

  const setSession = useCallback(async (route_id: number, route_name: string) => {
    const next: RouteSession = { route_id, route_name };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSessionState(next);
  }, []);

  const clearSession = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setSessionState(null);
  }, []);

  const value = useMemo(
    () => ({ session, ready, setSession, clearSession }),
    [session, ready, setSession, clearSession]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
