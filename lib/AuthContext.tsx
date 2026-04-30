"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { User } from "@/types";
import { api } from "@/lib/api";
import { identifyUser, resetAnalytics } from "@/lib/analytics";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (userData: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (u: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.get<User>("/users/me");
      setUser(data);
    } catch {
      // Retry once after a short delay before giving up (handles cold starts)
      await new Promise(r => setTimeout(r, 1500));
      try {
        const data = await api.get<User>("/users/me");
        setUser(data);
      } catch {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    // Initial session check on app load.
    //
    // A raw fetch is used (not the `api` helper) because the api helper
    // redirects to /login on 401 — which would create a redirect loop on
    // the login page itself for never-logged-in users.
    //
    // But we still need to handle the most common case: a returning user
    // whose 15-minute access token has expired but whose 7-day refresh
    // token is still valid. Without explicit refresh handling here, those
    // users get silently logged out every ~15 minutes even though the
    // session is supposed to last 7 days.
    //
    // Flow:
    //   1. GET /users/me. If it works, use the user data.
    //   2. If 401, POST /auth/refresh to mint a new access token from
    //      the refresh-token cookie. If that succeeds, retry GET /users/me.
    //   3. If anything else fails, treat as logged out (user=null).
    //
    // All requests use credentials: "include" so the HttpOnly cookies are
    // sent.
    let cancelled = false;
    (async () => {
      try {
        let res = await fetch("/api/users/me", { credentials: "include" });

        if (res.status === 401) {
          // Try to refresh, then retry the user fetch.
          const refresh = await fetch("/api/auth/refresh", {
            method: "POST",
            credentials: "include",
          });
          if (refresh.ok) {
            res = await fetch("/api/users/me", { credentials: "include" });
          }
        }

        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch {
        // Network error or similar — treat as logged out, the user can sign in again.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    identifyUser(userData.id, {
      role: userData.role,
      depot: userData.depot?.code,
      language: userData.language ?? "en",
    });
  };

  const logout = () => {
    // Revoke refresh token server-side and clear HttpOnly cookies
    fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
    resetAnalytics();
    setUser(null);
  };

  const updateUser = (u: User) => setUser(u);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
