import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { HorizontalScroller } from "../components/HorizontalScroller";
import { LoadingScreen } from "../components/LoadingScreen";
import { PosterRow } from "../components/PosterRow";
import { forumStars, StarRating } from "../components/StarRating";
import { cn, metaClass, pageClass, sectionTitleClass } from "../ui";

type Media = "pelicula" | "serie";

type Title = {
  id: number;
  titulo?: string;
  poster_url?: string | null;
  backdrop_url?: string | null;
  fecha_estreno?: string | null;
  sinopsis?: string | null;
  valoracion?: number | null;
  average_rating?: number | null;
  votos?: number | null;
  popularidad?: number | null;
  review_count?: number | null;
};

type Person = {
  id: number;
  nombre: string;
  foto_url?: string | null;
  departamento?: string;
  obras?: string[];
};

type Review = {
  id: number;
  username: string;
  pelicula_id: number;
  titulo: string;
  poster_url?: string | null;
  rating: number;
  comment: string;
};

function pickRow(rows: any[] | undefined, id: string) {
  return rows?.find((row) => row.id === id);
}

function communityCards(items: any[]): Title[] {
  return items.map((item) => ({
    id: item.id,
    titulo: item.titulo,
    poster_url: item.poster_url,
    valoracion: item.average_rating,
    average_rating: item.average_rating,
    review_count: item.review_count,
    sinopsis: item.detalles_extra?.overview || null,
  }));
}

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

function yearOf(item?: Title | null) {
  return (item?.fecha_estreno || "").slice(0, 4);
}

function hrefFor(item: Title, media: Media = "pelicula") {
  return media === "serie" ? `/buscar?q=${encodeURIComponent(item.titulo || "")}` : `/pelicula/${item.id}`;
}

function coverOf(item?: Title | null) {
  return item?.backdrop_url || item?.poster_url || "";
}

async function openTrailer(id: number, media: Media = "pelicula") {
  try {
    const data = await api.trailer(id, media);
    if (data?.url) window.open(data.url, "_blank", "noopener,noreferrer");
  } catch {
    /* tráiler opcional */
  }
}

export function HomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [trending, setTrending] = useState<Title[]>([]);
  const [nowPlaying, setNowPlaying] = useState<Title[]>([]);
  const [upcoming, setUpcoming] = useState<Title[]>([]);
  const [tvTrending, setTvTrending] = useState<Title[]>([]);
  const [comentadas, setComentadas] = useState<Title[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [recent, setRecent] = useState<Review[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      api.home(),
      api.tvHome(),
      api.people(),
      api.catalog("comentadas"),
      api.recentReviews(),
    ]).then(([homeRes, tvRes, peopleRes, communityRes, reviewsRes]) => {
      if (cancelled) return;
      const failed = [homeRes, tvRes, peopleRes, communityRes, reviewsRes].every(
        (result) => result.status === "rejected",
      );
      if (failed) {
        const first = homeRes as PromiseRejectedResult;
        setError(first.reason instanceof ApiError ? first.reason.message : "No se pudo cargar el inicio");
        return;
      }
      const home = settledValue(homeRes, { rows: [] });
      const tv = settledValue(tvRes, { rows: [] });
      const movieRows = home.rows || [];
      setTrending(pickRow(movieRows, "trending")?.results || pickRow(movieRows, "popular")?.results || []);
      setNowPlaying(pickRow(movieRows, "now_playing")?.results || []);
      setUpcoming(pickRow(movieRows, "upcoming")?.results || []);
      setTvTrending(pickRow(tv.rows, "tv_trending")?.results || pickRow(tv.rows, "tv_popular")?.results || []);
      setPeople(settledValue(peopleRes, { results: [] }).results || []);
      setComentadas(communityCards(settledValue(communityRes, [])).slice(0, 10));
      const reviews = settledValue(reviewsRes, []);
      setRecent(Array.isArray(reviews) ? reviews.slice(0, 6) : []);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <LoadingScreen />;

  const featured = trending.find((item) => coverOf(item)) || trending[0];
  const upNext = trending.filter((item) => item.id !== featured?.id).slice(0, 3);
  const highlight = nowPlaying.find((item) => coverOf(item)) || nowPlaying[0] || trending[1];
  const chartLead = comentadas[0] || nowPlaying[0];
  const comingLead = upcoming[0];

  return (
    <div className={pageClass}>
      {error && <p className="mb-6 text-[#ff8a80]">{error}</p>}

      {featured && (
        <section className="mb-10 grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
          <HeroCard item={featured} />
          <aside className="rounded-lg bg-surface p-4">
            <h2 className="mb-4 text-sm font-semibold tracking-[0.14em] text-accent-text uppercase">A continuación</h2>
            <div className="grid gap-4">
              {upNext.map((item) => (
                <Link key={item.id} className="flex gap-3 text-white hover:text-accent-text" to={hrefFor(item)}>
                  {item.poster_url ? (
                    <img className="h-[84px] w-[56px] shrink-0 rounded object-cover" src={item.poster_url} alt="" />
                  ) : (
                    <div className="h-[84px] w-[56px] shrink-0 rounded bg-surface-alt" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{item.titulo}</div>
                    <p className={metaClass}>{yearOf(item) || "Tendencia"}</p>
                    <button
                      type="button"
                      className="mt-1 border-0 bg-transparent p-0 text-xs text-accent-text"
                      onClick={(event) => {
                        event.preventDefault();
                        openTrailer(item.id);
                      }}
                    >
                      Ver tráiler
                    </button>
                  </div>
                </Link>
              ))}
            </div>
            <Link className="mt-5 inline-block text-sm text-accent-text" to="/peliculas/tendencias">
              Explorar tendencias
            </Link>
          </aside>
        </section>
      )}

      <section className="mb-10">
        <h2 className={sectionTitleClass}>Destacado hoy</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {highlight && (
            <Link
              className="relative min-h-[280px] overflow-hidden rounded-lg bg-surface text-white"
              to={hrefFor(highlight)}
            >
              {coverOf(highlight) && (
                <img className="absolute inset-0 h-full w-full object-cover" src={coverOf(highlight)} alt="" />
              )}
              <div className="absolute inset-0 bg-linear-to-t from-black via-black/35 to-transparent" />
              <div className="absolute right-3 bottom-3 left-3">
                <p className="mb-1 text-[11px] tracking-[0.14em] text-accent-text uppercase">En cartelera</p>
                <h3 className="text-2xl font-bold">{highlight.titulo}</h3>
                <p className={`${metaClass} mt-1 line-clamp-2`}>{highlight.sinopsis || "Esta semana en cines."}</p>
              </div>
            </Link>
          )}
          <article className="rounded-lg bg-surface p-5">
            <p className="mb-1 text-[11px] tracking-[0.14em] text-accent-text uppercase">Conversación</p>
            <h3 className="mb-4 text-xl font-bold">Lo que se discute en el foro</h3>
            {recent.length === 0 ? (
              <p className={metaClass}>Todavía no hay reseñas. Sé el primero en comentar una ficha.</p>
            ) : (
              <div className="grid gap-4">
                {recent.slice(0, 4).map((review) => (
                  <Link key={review.id} className="block text-white hover:text-accent-text" to={`/pelicula/${review.pelicula_id}`}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <strong className="truncate">{review.titulo}</strong>
                      <StarRating value={forumStars(review.rating)} readOnly size={12} />
                    </div>
                    <p className="line-clamp-2 text-sm text-muted">“{review.comment}”</p>
                    <p className={`${metaClass} mt-1`}>{review.username}</p>
                  </Link>
                ))}
              </div>
            )}
            <Link className="mt-4 inline-block text-sm text-accent-text" to="/foro/comentadas">
              Ver más conversación
            </Link>
          </article>
        </div>
      </section>

      {people.length > 0 && (
        <section className="mb-8">
          <h2 className={sectionTitleClass}>Personas en tendencia</h2>
          <HorizontalScroller itemWidth={148} ariaLabel="Personas en tendencia">
            {people.map((person, index) => (
              <article key={person.id} className="w-[132px] shrink-0 text-center">
                {person.foto_url ? (
                  <img
                    className="mx-auto h-[120px] w-[120px] rounded-full object-cover"
                    src={person.foto_url}
                    alt=""
                  />
                ) : (
                  <div className="mx-auto flex h-[120px] w-[120px] items-center justify-center rounded-full bg-surface-alt text-2xl">
                    {(person.nombre || "?").slice(0, 1)}
                  </div>
                )}
                <p className="mt-2 text-xs text-muted">{index + 1}</p>
                <div className="truncate text-sm font-semibold">{person.nombre}</div>
                {person.obras?.[0] && <p className={`${metaClass} truncate`}>{person.obras[0]}</p>}
              </article>
            ))}
          </HorizontalScroller>
        </section>
      )}

      {trending.length > 0 && <PosterRow title="Qué ver esta semana" items={trending.slice(0, 12)} />}
      {tvTrending.length > 0 && (
        <PosterRow title="Series de las que se habla" items={tvTrending.slice(0, 12)} media="serie" />
      )}

      {chartLead && (
        <section className="mt-4 mb-10">
          <h2 className={sectionTitleClass}>Lo más comentado en el foro</h2>
          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <FeaturedTitle item={chartLead} kicker="Más reseñas" />
            <RankedList
              items={(comentadas.length ? comentadas : nowPlaying).slice(0, 8)}
              valueOf={(item) => item.review_count || item.votos || item.valoracion || 0}
              labelOf={(item) =>
                item.review_count
                  ? `${item.review_count} reseñas`
                  : item.valoracion
                    ? Number(item.valoracion).toFixed(1)
                    : ""
              }
            />
          </div>
        </section>
      )}

      {comingLead && (
        <section className="mb-6">
          <h2 className={sectionTitleClass}>Próximamente en cines</h2>
          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <FeaturedTitle item={comingLead} kicker="Estreno" />
            <ul className="grid content-start gap-3">
              {upcoming.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <Link className="flex items-center justify-between gap-3 text-white hover:text-accent-text" to={hrefFor(item)}>
                    <span className="truncate">{item.titulo}</span>
                    <span className={metaClass}>{item.fecha_estreno || yearOf(item)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

function HeroCard({ item }: { item: Title }) {
  return (
    <article className="relative min-h-[360px] overflow-hidden rounded-lg bg-surface lg:min-h-[420px]">
      {coverOf(item) && <img className="absolute inset-0 h-full w-full object-cover" src={coverOf(item)} alt="" />}
      <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-black/10" />
      <div className="absolute right-5 bottom-5 left-5 max-w-[640px]">
        <p className="mb-2 text-[11px] tracking-[0.16em] text-accent-text uppercase">Tendencia de la semana</p>
        <h1 className="mb-2 text-3xl font-bold lg:text-4xl">{item.titulo}</h1>
        <p className="mb-4 line-clamp-3 text-sm text-muted">{item.sinopsis}</p>
        <div className="flex flex-wrap gap-3">
          <Link className="rounded-3xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover" to={hrefFor(item)}>
            Ver ficha
          </Link>
          <button
            type="button"
            className="rounded-3xl border-0 bg-white/15 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => openTrailer(item.id)}
          >
            Ver tráiler
          </button>
        </div>
      </div>
    </article>
  );
}

function FeaturedTitle({ item, kicker }: { item: Title; kicker: string }) {
  return (
    <Link className="block overflow-hidden rounded-lg bg-surface text-white" to={hrefFor(item)}>
      {item.poster_url ? (
        <img className="h-[280px] w-full object-cover" src={item.poster_url} alt="" />
      ) : (
        <div className="h-[180px] bg-surface-alt" />
      )}
      <div className="p-4">
        <p className="mb-1 text-[11px] tracking-[0.14em] text-accent-text uppercase">{kicker}</p>
        <h3 className="text-lg font-bold">{item.titulo}</h3>
        <p className={`${metaClass} mt-1`}>
          {yearOf(item)}
          {item.review_count ? ` · ${item.review_count} reseñas` : ""}
          {item.valoracion ? ` · ${Number(item.valoracion).toFixed(1)}` : ""}
        </p>
        {item.sinopsis && <p className="mt-2 line-clamp-4 text-sm text-muted">{item.sinopsis}</p>}
      </div>
    </Link>
  );
}

function RankedList({
  items,
  valueOf,
  labelOf,
}: {
  items: Title[];
  valueOf: (item: Title) => number;
  labelOf: (item: Title) => string;
}) {
  const max = Math.max(...items.map(valueOf), 1);
  return (
    <ol className="grid content-start gap-3">
      {items.map((item) => (
        <li key={item.id}>
          <Link className="block text-white hover:text-accent-text" to={hrefFor(item)}>
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="truncate">{item.titulo}</span>
              <span className={cn(metaClass, "shrink-0")}>{labelOf(item)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-alt">
              <div className="h-full rounded-full bg-accent-text" style={{ width: `${Math.max(8, (valueOf(item) / max) * 100)}%` }} />
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}
