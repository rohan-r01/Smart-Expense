"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import {
  api,
  type AuthTokens,
  type UserSession
} from "@/lib/api";
import { type SupportedCurrency } from "@/lib/currency";

type AuthContextValue = {
  tokens: AuthTokens | null;
  user: UserSession | null;
  ready: boolean;
  login: (tokens: AuthTokens) => void;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  updateCurrency: (currency: SupportedCurrency) => Promise<void>;
};

const STORAGE_KEY = "smart-expense-auth";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [user, setUser] = useState<UserSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setReady(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as AuthTokens;
      setTokens(parsed);
      setUser(api.parseJwt(parsed.accessToken));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setReady(true);
    }
  }, []);

  const persist = (nextTokens: AuthTokens | null) => {
    setTokens(nextTokens);
    setUser(nextTokens ? api.parseJwt(nextTokens.accessToken) : null);

    if (!nextTokens) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTokens));
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      tokens,
      user,
      ready,
      login(nextTokens) {
        persist(nextTokens);
      },
      async logout() {
        const refreshToken = tokens?.refreshToken;
        persist(null);

        if (refreshToken) {
          try {
            await api.logout(refreshToken);
          } catch {
            // Best-effort logout so local session is still cleared.
          }
        }
      },
      async refreshAccessToken() {
        if (!tokens?.refreshToken) return null;

        try {
          const result = await api.refresh(tokens.refreshToken);
          const nextTokens = {
            accessToken: result.accessToken,
            refreshToken: tokens.refreshToken
          };
          persist(nextTokens);
          return nextTokens.accessToken;
        } catch {
          persist(null);
          return null;
        }
      },
      async updateCurrency(currency) {
        if (!tokens?.accessToken) {
          throw new Error("No active session");
        }

        const result = await api.updateCurrency(tokens.accessToken, currency);
        persist({
          accessToken: result.accessToken,
          refreshToken: tokens.refreshToken
        });
      }
    }),
    [ready, tokens, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
