import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { LoadingScreen } from "../components/LoadingScreen";
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
  const [loading, setLoading] = useState(Boolean(session));
  const [posters, setPosters] = useState<string[]>([]);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      setReviews([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setError("");
    setLoading(true);
    Promise.all([api.me(), api.myReviews()])
      .then(([me, mine]) => {
        if (cancelled) return;
        setProfile(me);
        setReviews(mine);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          clear();
          return;
        }
        setProfile({ username: session.username, id: session.id, email: undefined, created_at: undefined });
        setReviews([]);
        setError("No se pudieron cargar las reseñas. Prueba a entrar de nuevo.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (session) return;
    let cancelled = false;
    api
      .home()
      .then((home) => {
        if (!cancelled) setPosters(collectPosters(home, 3));
      })
      .catch(() => {
        if (!cancelled) setPosters([]);
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

  if (session && loading) return <LoadingScreen />;

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

        {error && <p className="mb-6 text-[#ff8a80]">{error}</p>}

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
            <Link className="text-accent-text" to="/inicio">
              Explora el foro
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

  const form = (
    <AuthForm
      mode={mode}
      email={email}
      username={username}
      password={password}
      error={error}
      onEmail={setEmail}
      onUsername={setUsername}
      onPassword={setPassword}
      onMode={() => setMode(mode === "login" ? "register" : "login")}
      onSubmit={submit}
    />
  );

  return (
    <div className="grid min-h-0 flex-1 lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-[#152033] lg:flex lg:flex-col lg:justify-end lg:p-12">
        {posters.length > 0 && (
          <div className="pointer-events-none absolute inset-0 grid grid-cols-3">
            {posters.map((src) => (
              <img key={src} className="h-full min-h-0 w-full object-cover" src={src} alt="" />
            ))}
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, #152033 42%, rgba(21,32,51,0.55) 70%, rgba(21,32,51,0.2) 100%)",
          }}
        />
        <div className="relative z-[1] max-w-[420px]">
          <p className="mb-3 text-xs font-semibold tracking-[0.22em] text-accent-text">FOROPELIS</p>
          <h2 className="m-0 text-4xl leading-tight font-semibold">El foro de cine y series</h2>
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            Entra para publicar reseñas, seguir tendencias y comentar fichas con la comunidad.
          </p>
          <ul className="mt-8 grid list-none gap-3 p-0 text-sm text-white/80">
            <li>Reseñas en cada película y serie</li>
            <li>Cartelera, tendencias y lo más comentado</li>
            <li>Tu actividad queda en tu cuenta</li>
          </ul>
        </div>
      </aside>
      <div className="grid content-center bg-bg px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-6 lg:hidden">
            <p className="mb-2 text-xs font-semibold tracking-[0.22em] text-accent-text">FOROPELIS</p>
            <p className={metaClass}>Foro de cine y series</p>
          </div>
          {form}
        </div>
      </div>
    </div>
  );
}

function AuthForm({
  mode,
  email,
  username,
  password,
  error,
  onEmail,
  onUsername,
  onPassword,
  onMode,
  onSubmit,
}: {
  mode: "login" | "register";
  email: string;
  username: string;
  password: string;
  error: string;
  onEmail: (value: string) => void;
  onUsername: (value: string) => void;
  onPassword: (value: string) => void;
  onMode: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <div>
        <h1 className="m-0 text-3xl">{mode === "login" ? "Acceder" : "Crear cuenta"}</h1>
        <p className={`${metaClass} mt-2`}>
          {mode === "login"
            ? "Entra para publicar reseñas y ver tu actividad."
            : "Regístrate para comentar películas y series."}
        </p>
      </div>
      {mode === "register" && (
        <label className="grid gap-1.5 text-sm text-muted">
          Email
          <input
            className={fieldClass}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => onEmail(e.target.value)}
          />
        </label>
      )}
      <label className="grid gap-1.5 text-sm text-muted">
        Usuario
        <input className={fieldClass} autoComplete="username" value={username} onChange={(e) => onUsername(e.target.value)} />
      </label>
      <label className="grid gap-1.5 text-sm text-muted">
        Contraseña
        <input
          className={fieldClass}
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => onPassword(e.target.value)}
        />
      </label>
      <button className={`${primaryBtnClass} mt-1 w-full`} type="submit">
        {mode === "login" ? "Acceder" : "Crear cuenta"}
      </button>
      {error && <p className="text-sm text-[#ff8a80]">{error}</p>}
      <button type="button" className={`${ghostBtnClass} justify-center`} onClick={onMode}>
        {mode === "login" ? "¿Nuevo? Registrarse" : "¿Ya tienes cuenta? Acceder"}
      </button>
      <p className={`${metaClass} text-center`}>
        También puedes{" "}
        <Link className="text-accent-text" to="/inicio">
          entrar al foro sin cuenta
        </Link>
        .
      </p>
    </form>
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

function collectPosters(home: { rows?: { results?: { poster_url?: string | null }[] }[] }, limit: number) {
  const urls: string[] = [];
  for (const row of home.rows || []) {
    for (const item of row.results || []) {
      if (!item.poster_url || urls.includes(item.poster_url)) continue;
      urls.push(item.poster_url);
      if (urls.length === limit) return urls;
    }
  }
  return urls;
}

function formatJoined(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}
