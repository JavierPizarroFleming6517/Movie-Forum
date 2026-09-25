import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { HorizontalScroller } from "../components/HorizontalScroller";
import { LoadingScreen } from "../components/LoadingScreen";
import { forumStars, StarRating } from "../components/StarRating";
import { ReviewThread } from "../components/ReviewThread";
import { fieldClass, ghostBtnClass, hoverLiftClass, metaClass, pageClass, playBtnClass, sectionTitleClass, titleHref } from "../ui";
import { rememberRecent } from "../recent";

const STATUS_ES: Record<string, string> = {
  Released: "Estrenada",
  "Post Production": "En posproducción",
  "In Production": "En producción",
  Planned: "Planificada",
  Rumored: "Rumoreada",
  Canceled: "Cancelada",
  "Returning Series": "En emisión",
  Ended: "Finalizada",
  Pilot: "Piloto",
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
  const location = useLocation();
  const media = location.pathname.startsWith("/serie/") ? "serie" : "pelicula";
  const movieId = Number(id);
  const navigate = useNavigate();
  const { session } = useAuth();
  const [item, setItem] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [formStatus, setFormStatus] = useState("");
  const [editing, setEditing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    let cancelled = false;
    setError("");
    setItem(null);
    setReviews([]);
    setFormStatus("");
    setEditing(false);
    setVisibleCount(10);
    setRating(0);

    async function loadMovie() {
      try {
        const movie = media === "serie" ? await api.show(movieId) : await api.movie(movieId);
        if (cancelled) return;
        setItem(movie);
        try {
          const list = await api.reviews(movieId, media);
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
  }, [movieId, media]);

  useEffect(() => {
    if (!item || Number(item.id) !== movieId) return;
    rememberRecent({
      id: item.id,
      titulo: item.titulo,
      poster_url: item.poster_url,
      media,
    });
  }, [item, movieId, media]);

  const mine = session ? reviews.find((review) => review.user_id === session.id) : null;
  const orderedReviews = mine ? [mine, ...reviews.filter((review) => review.id !== mine.id)] : reviews;
  const visibleReviews = orderedReviews.slice(0, visibleCount);

  useEffect(() => {
    if (mine) {
      setRating(forumStars(mine.rating));
      setComment(mine.comment);
      return;
    }
    setRating(0);
    setComment("");
  }, [mine?.id, mine?.comment, mine?.rating]);

  async function reloadReviews() {
    setReviews(await api.reviews(movieId, media));
  }

  async function openTrailer() {
    try {
      const data = await api.trailer(movieId, media);
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
      await api.upsertReview(movieId, rating, comment.trim(), media);
      setFormStatus(mine ? "Reseña editada" : "Reseña publicada");
      setEditing(false);
      try {
        await reloadReviews();
      } catch {
        /* la ficha ya está visible */
      }
    } catch (err) {
      setFormStatus(err instanceof ApiError ? err.message : "No se pudo guardar");
    }
  }

  async function removeMine() {
    if (!session || !mine) return;
    if (!window.confirm("¿Borrar tu reseña y las respuestas del hilo?")) return;
    try {
      await api.deleteReview(movieId, media);
      setFormStatus("Reseña eliminada");
      setEditing(false);
      await reloadReviews();
    } catch (err) {
      setFormStatus(err instanceof ApiError ? err.message : "No se pudo borrar");
    }
  }

  if (error) return <div className={`${pageClass} text-[#ff8a80]`}>{error}</div>;
  if (!item || Number(item.id) !== movieId) return <LoadingScreen />;

  const extra = item.detalles_extra || {};
  const year = (extra.release_date || extra.first_air_date || "").slice(0, 4);
  const backdrop = extra.backdrop_path ? `https://image.tmdb.org/t/p/w1280${extra.backdrop_path}` : "";
  const cast = mainCast(extra);
  const recs = relatedTitles(extra, movieId);
  const keywords = (extra.keywords?.keywords || extra.keywords?.results || extra.keywords || [])
    .map((kw: any) => kw?.name)
    .filter(Boolean)
    .slice(0, 16);
  const directors =
    media === "serie"
      ? (extra.created_by || []).map((person: any) => person.name).filter(Boolean)
      : crewNames(extra, ["Director"]);
  const writers = media === "serie" ? [] : crewNames(extra, ["Screenplay", "Writer"]);
  const score = extra.vote_average ? Math.round(Number(extra.vote_average) * 10) : null;
  const facts = [
    certification(extra),
    formatDate(extra.release_date || extra.first_air_date),
    genres(extra),
    media === "serie" ? seasons(extra) : runtime(extra.runtime),
  ]
    .filter(Boolean)
    .join(" · ");
  const original = extra.original_language || "";

  return (
    <div className={pageClass}>
      <section
        className="overflow-hidden rounded-lg bg-bg bg-cover bg-center p-6"
        style={backdrop ? { backgroundImage: `linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.78)), url(${backdrop})` } : undefined}
      >
        <Link className="text-sm text-white" to="/inicio">
          ← Volver al inicio
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
                <strong>{media === "serie" ? "Creación" : "Dirección"}</strong>
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
      <div className="mt-6 grid grid-cols-1 gap-8 min-[901px]:grid-cols-[minmax(0,1fr)_260px]">
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
          {reviews.length === 0 && !session && <p className="mx-2 mb-6 text-[13px] text-muted">Todavía no hay reseñas. Sé el primero en opinar.</p>}
          {!mine && (
            <form className="mb-4 grid max-w-[520px] gap-2.5 rounded-lg border border-accent-text/40 bg-surface p-4" onSubmit={submit}>
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
          )}
          {visibleReviews.map((review) => {
            const isMine = session?.id === review.user_id;
            return (
            <article
              className={`mb-3 rounded-lg p-4 ${isMine ? "border border-accent-text/50 bg-surface" : "bg-surface"}`}
              key={review.id}
            >
              <div className="mb-2.5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent font-bold">
                  {(review.username || "U").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <strong>{isMine ? "Tu reseña" : review.username}</strong>
                  <div className={metaClass}>
                    Escrito por {review.username}
                    {review.created_at ? ` el ${formatDate(String(review.created_at))}` : ""}
                  </div>
                </div>
                <span className="ml-auto">
                  <StarRating value={forumStars(isMine && editing ? rating : review.rating)} readOnly={!isMine || !editing} size={18} onChange={isMine && editing ? setRating : undefined} />
                </span>
              </div>
              {isMine && editing ? (
                <form className="grid gap-2.5" onSubmit={submit}>
                  <textarea
                    className={fieldClass}
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button className={playBtnClass} type="submit">
                      Confirmar
                    </button>
                    <button
                      className={ghostBtnClass}
                      type="button"
                      onClick={() => {
                        setRating(forumStars(review.rating));
                        setComment(review.comment);
                        setEditing(false);
                        setFormStatus("");
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                  {formStatus && <p>{formStatus}</p>}
                </form>
              ) : (
                <>
                  <p>{review.comment}</p>
                  {isMine && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className={playBtnClass}
                        type="button"
                        onClick={() => {
                          setRating(forumStars(review.rating));
                          setComment(review.comment);
                          setFormStatus("");
                          setEditing(true);
                        }}
                      >
                        Editar reseña
                      </button>
                      <button className={ghostBtnClass} type="button" onClick={() => removeMine()}>
                        Borrar reseña
                      </button>
                    </div>
                  )}
                  {isMine && formStatus && <p className="mt-2">{formStatus}</p>}
                </>
              )}
              <ReviewThread
                review={review}
                sessionId={session?.id}
                isAdmin={session?.isAdmin}
                onChanged={reloadReviews}
              />
            </article>
            );
          })}
          {visibleCount < orderedReviews.length && (
            <button
              className={`${ghostBtnClass} mb-4`}
              type="button"
              onClick={() => setVisibleCount((count) => count + 10)}
            >
              Mostrar más ({orderedReviews.length - visibleCount} restantes)
            </button>
          )}
          {recs.length > 0 && (
            <section>
              <h2 className={sectionTitleClass}>Si te gustó {item.titulo}, también te puede gustar</h2>
              <HorizontalScroller itemWidth={162} ariaLabel="Recomendaciones">
                {recs.map((rec: any) => (
                  <Link className={`w-[150px] shrink-0 overflow-hidden rounded-lg text-white ${hoverLiftClass}`} key={rec.id} to={titleHref(rec.id, media)}>
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
          {media === "serie" ? (
            <>
              <Fact label="Temporadas" value={String(extra.number_of_seasons || "—")} />
              <Fact label="Episodios" value={String(extra.number_of_episodes || "—")} />
              <Fact label="Cadena" value={networks(extra)} />
            </>
          ) : (
            <>
              <Fact label="Presupuesto" value={money(extra.budget)} />
              <Fact label="Ingresos" value={money(extra.revenue)} />
            </>
          )}
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

function mainCast(extra: any) {
  const raw = extra.credits?.cast || extra.aggregate_credits?.cast || [];
  const list = Array.isArray(raw) ? raw : Object.values(raw);
  return list.slice(0, 12).map((actor: any) => ({
    ...actor,
    character: actor.character || actor.roles?.[0]?.character || "",
  }));
}

function relatedTitles(extra: any, currentId: number) {
  const seen = new Set<number>([currentId]);
  const out: any[] = [];
  for (const item of [...(extra.related_search || []), ...(extra.recommendations?.results || [])]) {
    const id = Number(item?.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out.slice(0, 12);
}

function seasons(extra: any) {
  const count = Number(extra.number_of_seasons);
  if (!count) return "";
  return count === 1 ? "1 temporada" : `${count} temporadas`;
}

function networks(extra: any) {
  const names = (extra.networks || []).map((item: any) => item.name).filter(Boolean);
  return names.join(", ") || "—";
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
  for (const block of extra.content_ratings?.results || []) {
    if (!["ES", "US", "MX"].includes(block.iso_3166_1)) continue;
    const cert = (block.rating || "").trim();
    if (cert) return cert;
  }
  return "";
}

function money(value: unknown) {
  const amount = Number(value);
  if (!amount) return "—";
  return `$${amount.toLocaleString("en-US")}`;
}
