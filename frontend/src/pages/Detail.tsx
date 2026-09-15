import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { HorizontalScroller } from "../components/HorizontalScroller";
import { forumStars, StarRating } from "../components/StarRating";
import { fieldClass, hoverLiftClass, metaClass, pageClass, playBtnClass, sectionTitleClass } from "../ui";

const STATUS_ES: Record<string, string> = {
  Released: "Estrenada",
  "Post Production": "En posproducción",
  "In Production": "En producción",
  Planned: "Planificada",
  Rumored: "Rumoreada",
  Canceled: "Cancelada",
};

const LANG_ES: Record<string, string> = {
  en: "Inglés",
  es: "Español",
  fr: "Francés",
  de: "Alemán",
  it: "Italiano",
  ja: "Japonés",
  ko: "Coreano",
  pt: "Portugués",
  zh: "Chino",
  hi: "Hindi",
  ru: "Ruso",
};

export function DetailPage() {
  const { id } = useParams();
  const movieId = Number(id);
  const navigate = useNavigate();
  const { session } = useAuth();
  const [item, setItem] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [formStatus, setFormStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError("");
    setItem(null);
    setReviews([]);
    setFormStatus("");
    setRating(0);

    async function loadMovie() {
      try {
        const movie = await api.movie(movieId);
        if (cancelled) return;
        setItem(movie);
        try {
          const list = await api.reviews(movieId);
          if (!cancelled) setReviews(list);
        } catch {
          if (!cancelled) setReviews([]);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "No se pudo abrir la ficha");
      }
    }

    loadMovie();
    return () => {
      cancelled = true;
    };
  }, [movieId]);

  async function openTrailer() {
    try {
      const data = await api.trailer(movieId);
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setFormStatus(err instanceof ApiError ? err.message : "Sin tráiler");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!session) {
      navigate("/cuenta");
      return;
    }
    if (!rating) {
      setFormStatus("Elige una calificación de 1 a 5 estrellas");
      return;
    }
    if (!comment.trim()) {
      setFormStatus("Escribe un comentario");
      return;
    }
    try {
      await api.upsertReview(movieId, rating, comment.trim());
      setFormStatus("Reseña guardada");
      setComment("");
      setRating(0);
      try {
        setReviews(await api.reviews(movieId));
      } catch {
        /* la ficha ya está visible */
      }
    } catch (err) {
      setFormStatus(err instanceof ApiError ? err.message : "No se pudo guardar");
    }
  }

  if (error) return <div className={`${pageClass} text-[#ff8a80]`}>{error}</div>;
  if (!item) return <div className={pageClass}>Cargando ficha…</div>;

  const extra = item.detalles_extra || {};
  const year = (extra.release_date || "").slice(0, 4);
  const backdrop = extra.backdrop_path ? `https://image.tmdb.org/t/p/w1280${extra.backdrop_path}` : "";
  const cast = extra.credits?.cast?.slice(0, 12) || [];
  const recs = extra.recommendations?.results?.slice(0, 10) || [];
  const keywords = (extra.keywords?.keywords || extra.keywords || [])
    .map((kw: any) => kw?.name)
    .filter(Boolean)
    .slice(0, 16);
  const directors = crewNames(extra, ["Director"]);
  const writers = crewNames(extra, ["Screenplay", "Writer"]);
  const score = extra.vote_average ? Math.round(Number(extra.vote_average) * 10) : null;
  const facts = [certification(extra), formatDate(extra.release_date), genres(extra), runtime(extra.runtime)]
    .filter(Boolean)
    .join(" · ");
  const original = extra.original_language || "";

  return (
    <div>
      <section
        className="max-w-full overflow-hidden bg-[#0d0d0d] bg-cover bg-center py-7 pr-6 pl-14 max-md:pl-12"
        style={backdrop ? { backgroundImage: `linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.78)), url(${backdrop})` } : undefined}
      >
        <Link className="text-sm text-white" to="/catalogo">
          ← Volver al catálogo
        </Link>
        <div className="mt-[18px] flex min-w-0 items-start gap-7 max-md:flex-col">
          {item.poster_url ? (
            <img className="w-[220px] min-h-[330px] rounded-[10px] object-cover shadow-[0_8px_24px_#000a] max-md:min-h-0 max-md:w-full max-md:max-w-[220px]" src={item.poster_url} alt="" />
          ) : (
            <div className="flex w-[220px] min-h-[330px] items-center justify-center rounded-[10px] bg-surface-alt max-md:min-h-0 max-md:w-full max-md:max-w-[220px]" />
          )}
          <div className="min-w-0">
            <h1 className="mb-2 text-[32px]">
              {item.titulo} {year ? `(${year})` : ""}
            </h1>
            {facts && <p className="mb-4">{facts}</p>}
            <div className="flex flex-wrap items-center gap-5">
              <ScoreRing percent={score} />
              <button className={playBtnClass} type="button" onClick={openTrailer}>
                ▶ Reproducir tráiler
              </button>
            </div>
            {extra.tagline && <p className="mt-3 italic text-muted">{extra.tagline}</p>}
            <h2 className="mt-[18px] mb-2 text-xl">Vista general</h2>
            <p className="max-w-[72ch] leading-normal">{extra.overview || "Sin sinopsis."}</p>
            <div className="mt-4 flex gap-10">
              <div>
                <strong>Dirección</strong>
                <div className={metaClass}>{directors.join(", ") || "—"}</div>
              </div>
              {writers.length > 0 && (
                <div>
                  <strong>Guion</strong>
                  <div className={metaClass}>{writers.slice(0, 3).join(", ")}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      <div className="grid max-w-full grid-cols-1 gap-8 px-6 pt-7 pr-6 pb-12 pl-14 max-md:pl-12 min-[901px]:grid-cols-[minmax(0,1fr)_260px]">
        <div>
          {cast.length > 0 && (
            <section>
              <h2 className={sectionTitleClass}>Reparto principal</h2>
              <HorizontalScroller itemWidth={152} ariaLabel="Reparto">
                {cast.map((actor: any) => (
                  <div className={`w-[140px] shrink-0 overflow-hidden rounded-lg bg-surface ${hoverLiftClass}`} key={actor.id || actor.name}>
                    {actor.profile_path ? (
                      <img className="h-[175px] w-[140px] bg-surface-alt object-cover" src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`} alt={actor.name} />
                    ) : (
                      <div className="flex h-[175px] w-[140px] items-center justify-center bg-surface-alt text-3xl">👤</div>
                    )}
                    <div className="p-2">
                      <strong>{actor.name}</strong>
                      <div className={metaClass}>{actor.character}</div>
                    </div>
                  </div>
                ))}
              </HorizontalScroller>
            </section>
          )}
          <h2 className={sectionTitleClass}>{reviews.length ? `Reseñas ${reviews.length}` : "Reseñas"}</h2>
          {reviews.length === 0 && <p className="mx-2 mb-6 text-[13px] text-muted">Todavía no hay reseñas. Sé el primero en opinar.</p>}
          {reviews.map((review) => (
            <article className="mb-3 rounded-lg bg-surface p-4" key={review.id}>
              <div className="mb-2.5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent font-bold">
                  {(review.username || "U").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <strong>{review.username}</strong>
                  <div className={metaClass}>
                    Escrito por {review.username}
                    {review.created_at ? ` el ${formatDate(String(review.created_at))}` : ""}
                  </div>
                </div>
                <span className="ml-auto">
                  <StarRating value={forumStars(review.rating)} readOnly size={18} />
                </span>
              </div>
              <p>{review.comment}</p>
            </article>
          ))}
          <form className="mt-4 grid max-w-[520px] gap-2.5" onSubmit={submit}>
            <h3 className="text-lg font-semibold">Tu reseña</h3>
            {session ? (
              <>
                <div>
                  {rating > 0 && <p className="mb-1.5 text-sm text-muted">{rating} de 5 estrellas</p>}
                  <StarRating value={rating} onChange={setRating} />
                </div>
                <textarea
                  className={fieldClass}
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Escribe tu opinión"
                />
                <button className={playBtnClass} type="submit">
                  Publicar reseña
                </button>
              </>
            ) : (
              <p className="text-[13px] text-muted">
                Inicia sesión en <Link to="/cuenta">Cuenta</Link> para calificar y comentar.
              </p>
            )}
            {formStatus && <p>{formStatus}</p>}
          </form>
          {recs.length > 0 && (
            <section>
              <h2 className={sectionTitleClass}>Si te gustó {item.titulo}, también te puede gustar</h2>
              <HorizontalScroller itemWidth={162} ariaLabel="Recomendaciones">
                {recs.map((rec: any) => (
                  <Link className={`w-[150px] shrink-0 overflow-hidden rounded-lg text-white ${hoverLiftClass}`} key={rec.id} to={`/pelicula/${rec.id}`}>
                    {rec.poster_path ? (
                      <img className="h-[225px] w-[150px] rounded-lg bg-surface-alt object-cover" src={`https://image.tmdb.org/t/p/w500${rec.poster_path}`} alt="" />
                    ) : (
                      <div className="h-[225px] w-[150px] rounded-lg bg-surface-alt" />
                    )}
                    <span className="mt-1.5 block text-xs">{rec.title || rec.name}</span>
                  </Link>
                ))}
              </HorizontalScroller>
            </section>
          )}
        </div>
        <aside className="grid content-start gap-[18px]">
          <Fact label="Estado" value={STATUS_ES[extra.status] || extra.status || "—"} />
          <Fact label="Idioma original" value={LANG_ES[original] || original.toUpperCase() || "—"} />
          <Fact label="Presupuesto" value={money(extra.budget)} />
          <Fact label="Ingresos" value={money(extra.revenue)} />
          <div>
            <strong>Palabras clave</strong>
            {keywords.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {keywords.map((name: string) => (
                  <span key={name} className="rounded-2xl bg-surface-alt px-2.5 py-1.5 text-xs">
                    {name}
                  </span>
                ))}
              </div>
            ) : (
              <p className={metaClass}>Sin palabras clave.</p>
            )}
          </div>
          <Fact
            label="En el foro"
            value={`${item.review_count || 0} reseñas${item.average_rating != null ? ` · ${forumStars(item.average_rating)}/5` : ""}`}
          />
        </aside>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <p className="m-0 grid gap-0.5">
      <strong>{label}</strong>
      <span className={metaClass}>{value}</span>
    </p>
  );
}

function ScoreRing({ percent }: { percent: number | null }) {
  const value = percent ?? 0;
  const color = percent == null ? "#888" : percent >= 70 ? "#21D07A" : percent >= 40 ? "#D2D531" : "#DB2360";
  const track = percent == null ? "#333" : percent >= 70 ? "#204529" : percent >= 40 ? "#423D0F" : "#571435";
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-16 w-16 rounded-full bg-[#081c22]">
        <svg className="block" width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke={track} strokeWidth="5" />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            transform="rotate(-90 32 32)"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
          {percent == null ? "NR" : `${percent}%`}
        </span>
      </div>
      <div className="text-[13px] leading-tight font-semibold">
        Puntuación
        <br />
        de usuarios
      </div>
    </div>
  );
}

function crewNames(extra: any, jobs: string[]) {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const person of extra.credits?.crew || []) {
    if (!jobs.includes(person.job) || !person.name || seen.has(person.name)) continue;
    seen.add(person.name);
    names.push(person.name);
  }
  return names;
}

function formatDate(value?: string) {
  const text = (value || "").slice(0, 10);
  if (text.length < 10) return "";
  const [year, month, day] = text.split("-");
  return `${Number(day)}/${Number(month)}/${year}`;
}

function runtime(minutes: unknown) {
  const total = Number(minutes);
  if (!total) return "";
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
}

function genres(extra: any) {
  return (extra.genres || []).map((g: any) => g.name).filter(Boolean).join(", ");
}

function certification(extra: any) {
  for (const block of extra.release_dates?.results || []) {
    if (!["ES", "US", "MX"].includes(block.iso_3166_1)) continue;
    for (const release of block.release_dates || []) {
      const cert = (release.certification || "").trim();
      if (cert) return cert;
    }
  }
  return "";
}

function money(value: unknown) {
  const amount = Number(value);
  if (!amount) return "—";
  return `$${amount.toLocaleString("en-US")}`;
}
