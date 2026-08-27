import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiFetch } from "../api/client";
import { saveTokens, clearTokens, getTokens } from "./tokens";
import type { AuthResponse, User } from "../api/types";
import type { Goal } from "@gymapp/shared";

interface AuthState {
  user: User | null;
  loading: boolean;
  register: (input: { email: string; password: string; name: string; goal?: Goal }) => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Ao abrir o app: se tem token guardado, tenta recuperar a sessao.
  useEffect(() => {
    (async () => {
      const tokens = await getTokens();
      if (!tokens) {
        setLoading(false);
        return;
      }
      try {
        const me = await apiFetch<{ user: User }>("/auth/me");
        setUser(me.user);
      } catch {
        await clearTokens();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleAuth = useCallback((res: AuthResponse) => {
    setUser(res.user);
    return saveTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
  }, []);

  const register = useCallback(
    async (input: { email: string; password: string; name: string; goal?: Goal }) => {
      const res = await apiFetch<AuthResponse>("/auth/register", {
        method: "POST",
        body: input,
        auth: false,
      });
      await handleAuth(res);
    },
    [handleAuth],
  );

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      const res = await apiFetch<AuthResponse>("/auth/login", {
        method: "POST",
        body: input,
        auth: false,
      });
      await handleAuth(res);
    },
    [handleAuth],
  );

  const logout = useCallback(async () => {
    const tokens = await getTokens();
    if (tokens?.refreshToken) {
      try {
        await apiFetch("/auth/logout", {
          method: "POST",
          body: { refreshToken: tokens.refreshToken },
          auth: false,
        });
      } catch {
        // best-effort
      }
    }
    await clearTokens();
    setUser(null);
  }, []);

  const refreshMe = useCallback(async () => {
    const me = await apiFetch<{ user: User }>("/auth/me");
    setUser(me.user);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
