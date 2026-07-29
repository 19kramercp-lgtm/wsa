import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { api } from "../api/client";
import { getAuthToken, setAuthToken, setUnauthorizedHandler } from "../api/client";
import type { SafeUser } from "../types";

interface AuthContextValue {
  user: SafeUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function clearSession() {
      setAuthToken(null);
      setUser(null);
    }
    setUnauthorizedHandler(clearSession);

    if (!getAuthToken()) {
      setLoading(false);
      return;
    }
    api.auth
      .me()
      .then(setUser)
      .catch(() => clearSession())
      .finally(() => setLoading(false));

    return () => setUnauthorizedHandler(null);
  }, []);

  async function login(email: string, password: string) {
    const { token, user: loggedInUser } = await api.auth.login(email, password);
    setAuthToken(token);
    setUser(loggedInUser);
  }

  function logout() {
    setAuthToken(null);
    setUser(null);
  }

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
