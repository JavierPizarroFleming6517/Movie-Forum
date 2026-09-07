import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { fieldClass, ghostBtnClass, primaryBtnClass } from "../ui";

export function AuthPage() {
  const { session, setSession, clear } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const data =
        mode === "login"
          ? await api.login(username, password)
          : await api.register(email, username, password);
      setSession(data.access_token, data.user.id, data.user.username);
      navigate("/catalogo");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo autenticar");
    }
  }

  if (session) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        <div className="grid w-full max-w-[420px] gap-3.5">
          <h1 className="m-0 text-4xl">Tu cuenta</h1>
          <p>Sesión iniciada como {session.username}</p>
          <button className={primaryBtnClass} onClick={() => clear()}>
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-4">
      <form className="grid w-full max-w-[420px] gap-3.5" onSubmit={submit}>
        <h1 className="m-0 text-4xl">{mode === "login" ? "Acceder" : "Registrarse"}</h1>
        {mode === "register" && (
          <input className={fieldClass} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        )}
        <input className={fieldClass} placeholder="Usuario" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input
          className={fieldClass}
          placeholder="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className={primaryBtnClass} type="submit">
          {mode === "login" ? "Acceder" : "Crear cuenta"}
        </button>
        {error && <p className="text-[#ff8a80]">{error}</p>}
        <button
          type="button"
          className={ghostBtnClass}
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "¿Nuevo? Registrarse" : "¿Ya tienes cuenta? Acceder"}
        </button>
      </form>
    </div>
  );
}
