import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../api/client";

type Session = { token: string; id: number; username: string; isAdmin: boolean } | null;

type AuthValue = {
  session: Session;
  setSession: (token: string, id: number, username: string, isAdmin?: boolean) => void;
  clear: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

function persist(session: NonNullable<Session>) {
  localStorage.setItem("token", session.token);
  localStorage.setItem("userId", String(session.id));
  localStorage.setItem("username", session.username);
  localStorage.setItem("isAdmin", session.isAdmin ? "1" : "0");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setState] = useState<Session>(() => {
    const token = localStorage.getItem("token");
    const id = Number(localStorage.getItem("userId") || 0);
    const username = localStorage.getItem("username");
    const isAdmin = localStorage.getItem("isAdmin") === "1";
    return token && username ? { token, id, username, isAdmin } : null;
  });

  useEffect(() => {
    if (!session?.token) return;
    let cancelled = false;
    api
      .me()
      .then((me) => {
        if (cancelled) return;
        const next = {
          token: session.token,
          id: me.id ?? session.id,
          username: me.username ?? session.username,
          isAdmin: Boolean(me.is_admin),
        };
        persist(next);
        setState(next);
      })
      .catch(() => {
        /* keep cached session */
      });
    return () => {
      cancelled = true;
    };
  }, [session?.token]);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      setSession: (token, id, username, isAdmin = false) => {
        const next = { token, id, username, isAdmin };
        persist(next);
        setState(next);
      },
      clear: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        localStorage.removeItem("username");
        localStorage.removeItem("isAdmin");
        setState(null);
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fuera de AuthProvider");
  return ctx;
}
