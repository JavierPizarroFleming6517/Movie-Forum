import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { forumStars, StarRating } from "../components/StarRating";
import { fieldClass, ghostBtnClass, metaClass, pageClass, primaryBtnClass } from "../ui";

export function AuthPage() {
  const { session, setSession, clear } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      setReviews([]);
      return;
    }
    let cancelled = false;
    Promise.all([api.me(), api.myReviews()])
      .then(([me, mine]) => {
        if (cancelled) return;
        setProfile(me);
        setReviews(mine);
      })
      .catch(() => {
        if (cancelled) return;
        setProfile({ username: session.username, id: session.id });
        setReviews([]);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const data =
        mode === "login"
          ? await api.login(username, password)
          : await api.register(email, username, password);
      setSession(data.access_token, data.user.id, data.user.username, Boolean(data.user.is_admin));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo autenticar");
    }
  }

  if (session) {
    const initial = (profile?.username || session.username || "U").slice(0, 1).toUpperCase();
    const avg =
      reviews.length > 0
        ? Math.round((reviews.reduce((sum, r) => sum + forumStars(r.rating), 0) / reviews.length) * 10) / 10
        : null;
    return (
      <div className={pageClass}>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-2xl font-bold">
              {initial}
            </div>
            <div>
              <h1 className="m-0 text-3xl">{profile?.username || session.username}</h1>
              <p className={metaClass}>{profile?.email || "Miembro del foro"}</p>
              {(profile?.is_admin || session.isAdmin) && (
                <p className="mt-1 text-xs font-semibold tracking-wide text-accent-text uppercase">Administrador</p>
              )}
            </div>
          </div>
          <button className={primaryBtnClass} onClick={() => clear()}>
            Cerrar sesión
          </button>
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          <Stat label="Reseñas" value={String(reviews.length)} />
          <Stat label="Promedio" value={avg != null ? `${avg}/5` : "—"} />
          <Stat label="Miembro desde" value={formatJoined(profile?.created_at)} />
        </div>

        {(profile?.is_admin || session.isAdmin) && (
          <p className="mb-8 text-sm text-muted">
            Puedes ver la actividad del foro en{" "}
            <Link className="text-accent-text" to="/metricas">
              Métricas
            </Link>
            .
          </p>
        )}

        <h2 className="mb-3 text-xl font-semibold">Tus reseñas</h2>
        {reviews.length === 0 ? (
          <p className={metaClass}>
            Todavía no has publicado reseñas.{" "}
            <Link className="text-accent-text" to="/catalogo">
              Explora el catálogo
            </Link>{" "}
            y comenta una película.
          </p>
        ) : (
          <div className="grid gap-3">
            {reviews.map((review) => (
              <Link
                key={review.id}
                className="flex gap-3 rounded-lg bg-surface p-3 text-white hover:bg-surface-alt"
                to={`/pelicula/${review.pelicula_id}`}
              >
                {review.poster_url ? (
                  <img className="h-[90px] w-[60px] shrink-0 rounded object-cover" src={review.poster_url} alt="" />
                ) : (
                  <div className="flex h-[90px] w-[60px] shrink-0 items-center justify-center rounded bg-header">🎬</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <strong>{review.titulo}</strong>
                    <StarRating value={forumStars(review.rating)} readOnly size={16} />
                  </div>
                  <p className="m-0 line-clamp-2 text-sm text-muted">{review.comment}</p>
                  {review.created_at && (
                    <p className={`${metaClass} mt-1`}>{formatJoined(review.created_at)}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[140px] rounded-lg bg-surface px-5 py-4">
      <div className={metaClass}>{label}</div>
      <b className="mt-1 block text-xl">{value}</b>
    </div>
  );
}

function formatJoined(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}
