import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { API_BASE } from "../constants/config";

const STORAGE_KEY = "route_sync_admin_secret";

type AdminAuthValue = {
  ready: boolean;
  adminSecret: string | null;
  isAdmin: boolean;
  loginWithPassword: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [adminSecret, setAdminSecretState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const s = raw?.trim();
        setAdminSecretState(s || null);
      })
      .finally(() => setReady(true));
  }, []);

  const persistSecret = useCallback(async (secret: string | null) => {
    if (secret?.trim()) {
      await AsyncStorage.setItem(STORAGE_KEY, secret.trim());
      setAdminSecretState(secret.trim());
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setAdminSecretState(null);
    }
  }, []);

  const loginWithPassword = useCallback(async (password: string): Promise<boolean> => {
    const trimmed = password.trim();
    if (!trimmed) return false;
    try {
      const res = await fetch(`${API_BASE}/admin/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_secret: trimmed }),
      });
      if (!res.ok) return false;
      await persistSecret(trimmed);
      return true;
    } catch {
      return false;
    }
  }, [persistSecret]);

  const logout = useCallback(async () => {
    await persistSecret(null);
  }, [persistSecret]);

  const value = useMemo(
    () => ({
      ready,
      adminSecret,
      isAdmin: Boolean(adminSecret),
      loginWithPassword,
      logout,
    }),
    [ready, adminSecret, loginWithPassword, logout]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}

export function adminSecretHeaders(secret: string | null | undefined): Record<string, string> {
  const s = secret?.trim();
  if (!s) return {};
  return { "X-Admin-Secret": s };
}
