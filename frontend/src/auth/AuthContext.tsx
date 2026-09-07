import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type Session = { token: string; id: number; username: string } | null;

type AuthValue = {
  session: Session;
  setSession: (token: string, id: number, username: string) => void;
  clear: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setState] = useState<Session>(() => {
    const token = localStorage.getItem("token");
    const id = Number(localStorage.getItem("userId") || 0);
    const username = localStorage.getItem("username");
    return token && username ? { token, id, username } : null;
  });

  const value = useMemo<AuthValue>(
    () => ({
      session,
      setSession: (token, id, username) => {
        localStorage.setItem("token", token);
        localStorage.setItem("userId", String(id));
        localStorage.setItem("username", username);
        setState({ token, id, username });
      },
      clear: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        localStorage.removeItem("username");
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
