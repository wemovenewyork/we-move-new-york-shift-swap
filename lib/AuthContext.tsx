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
    // Use a raw fetch for the initial session check so a missing/expired cookie
    // silently sets user=null rather than triggering the api.ts redirect loop.
    fetch("/api/users/me", { credentials: "include" })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setUser(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
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
