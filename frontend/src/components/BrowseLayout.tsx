import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { forumStars, StarRating } from "./StarRating";
import { HorizontalScroller } from "./HorizontalScroller";
import { cn, metaClass, sectionTitleClass, titleHref } from "../ui";

export type BrowseItem = {
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

type Media = "pelicula" | "serie";
type SortKey = "popular" | "rated" | "recent";

type Review = {
  id: number;
  username: string;
  pelicula_id: number;
  titulo?: string;
  rating: number;
  comment: string;
};

function ratingOf(item: BrowseItem) {
  return Number(item.average_rating ?? item.valoracion ?? 0);
}

function yearOf(item?: BrowseItem) {
  return (item?.fecha_estreno || "").slice(0, 4);
}

function hrefFor(item: BrowseItem, media: Media) {
  return titleHref(item.id, media);
}

function coverOf(item?: BrowseItem) {
  return item?.backdrop_url || item?.poster_url || "";
}

async function openTrailer(id: number, media: Media) {
  try {
    const data = await api.trailer(id, media);
    if (data?.url) window.open(data.url, "_blank", "noopener,noreferrer");
  } catch {
    /* tráiler opcional */
  }
}

function sortItems(items: BrowseItem[], sort: SortKey) {
  const copy = [...items];
  if (sort === "rated") {
    copy.sort((a, b) => ratingOf(b) - ratingOf(a) || (b.votos || 0) - (a.votos || 0));
  } else if (sort === "recent") {
    copy.sort((a, b) => String(b.fecha_estreno || "").localeCompare(String(a.fecha_estreno || "")));
  } else {
    copy.sort(
      (a, b) =>
        (b.popularidad || b.review_count || b.votos || 0) - (a.popularidad || a.review_count || a.votos || 0),
    );
  }
  return copy;
}

export function BrowseLayout({
  heading,
  sub,
  items,
  media = "pelicula",
}: {
  heading: string;
  sub: string;
  items: BrowseItem[];
  media?: Media;
}) {
  const [sort, setSort] = useState<SortKey>("popular");
  const [featuredReviews, setFeaturedReviews] = useState<Review[]>([]);
  const [aroundReviews, setAroundReviews] = useState<Review[]>([]);
  const sorted = useMemo(() => sortItems(items, sort), [items, sort]);
  const featured = sorted.find((item) => coverOf(item)) || sorted[0];
  const related = sorted.filter((item) => item.id !== featured?.id).slice(0, 8);
  const lead = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const conversation = featuredReviews.length ? featuredReviews : aroundReviews;

  useEffect(() => {
    if (!featured || media !== "pelicula") {
      setFeaturedReviews([]);
      setAroundReviews([]);
      return;
    }
    let cancelled = false;
    const ids = new Set(items.map((item) => item.id));
    Promise.all([api.reviews(featured.id).catch(() => []), api.recentReviews().catch(() => [])]).then(
      ([own, recent]) => {
        if (cancelled) return;
        setFeaturedReviews(Array.isArray(own) ? own.slice(0, 5) : []);
        setAroundReviews(
          (Array.isArray(recent) ? recent : [])
            .filter((review: Review) => ids.has(review.pelicula_id))
            .slice(0, 5),
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [featured?.id, media, items]);

  if (!items.length) {
    return (
      <>
        <h1 className="mb-1 text-[30px]">{heading}</h1>
        <p className="text-[13px] text-muted">{sub}</p>
        <p className="mt-8 text-muted">No hay títulos en este recorte.</p>
      </>
    );
  }

  return (
    <>
      <header className="mb-8 flex items-end gap-4">
        {featured?.poster_url ? (
          <img className="h-[108px] w-[72px] rounded-md object-cover" src={featured.poster_url} alt="" />
        ) : null}
        <div className="min-w-0">
          <p className="text-sm text-accent-text">{media === "serie" ? "Series" : "Películas"}</p>
          <h1 className="text-[32px] leading-tight">{heading}</h1>
          <p className={metaClass}>{sub}</p>
        </div>
      </header>

      {featured && (
        <section className="mb-10">
          <h2 className={sectionTitleClass}>Destacados</h2>
          <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)_280px]">
            <Link className="overflow-hidden rounded-lg bg-surface" to={hrefFor(featured, media)}>
              {featured.poster_url ? (
                <img className="h-full min-h-[280px] w-full object-cover" src={featured.poster_url} alt="" />
              ) : (
                <div className="flex min-h-[280px] items-center justify-center bg-surface-alt text-4xl">🎬</div>
              )}
            </Link>
            <article className="relative min-h-[280px] overflow-hidden rounded-lg bg-surface">
              {coverOf(featured) && (
                <img className="absolute inset-0 h-full w-full object-cover" src={coverOf(featured)} alt="" />
              )}
              <div className="absolute inset-0 bg-linear-to-t from-black via-black/35 to-black/10" />
              <div className="absolute right-4 bottom-4 left-4">
                <Link className="text-white hover:text-accent-text" to={hrefFor(featured, media)}>
                  <h3 className="text-2xl font-bold">{featured.titulo}</h3>
                </Link>
                <p className={`${metaClass} mt-1`}>
                  {yearOf(featured)}
                  {ratingOf(featured) ? ` · ★ ${ratingOf(featured).toFixed(1)}` : ""}
                  {featured.review_count ? ` · ${featured.review_count} reseñas` : ""}
                </p>
                {featured.sinopsis && <p className="mt-2 line-clamp-3 text-sm text-muted">{featured.sinopsis}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    className="rounded-3xl bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover"
                    to={hrefFor(featured, media)}
                  >
                    Ver ficha
                  </Link>
                  <button
                    type="button"
                    className="rounded-3xl border-0 bg-white/15 px-3 py-1.5 text-sm font-semibold text-white"
                    onClick={() => openTrailer(featured.id, media)}
                  >
                    Ver tráiler
                  </button>
                </div>
              </div>
            </article>
            <aside className="max-h-[420px] overflow-auto rounded-lg bg-surface p-4">
              <p className="mb-3 text-[11px] tracking-[0.14em] text-accent-text uppercase">
                {featuredReviews.length ? "Reseñas" : "Conversación del recorte"}
              </p>
              {conversation.length === 0 ? (
                <p className={metaClass}>
                  Todavía no hay reseñas aquí.{" "}
                  <Link className="text-accent-text" to={hrefFor(featured, media)}>
                    Abre la ficha
                  </Link>{" "}
                  y deja la primera.
                </p>
              ) : (
                <div className="grid gap-3">
                  {conversation.map((review) => (
                    <Link
                      key={review.id}
                      className="block rounded-md bg-surface-alt p-3 text-white hover:text-accent-text"
                      to={`/pelicula/${review.pelicula_id}`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <strong className="truncate text-sm">{review.username}</strong>
                        <StarRating value={forumStars(review.rating)} readOnly size={12} />
                      </div>
                      <p className="line-clamp-3 text-sm text-muted">{review.comment}</p>
                    </Link>
                  ))}
                </div>
              )}
            </aside>
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mb-10">
          <h2 className={sectionTitleClass}>También en {heading}</h2>
          <HorizontalScroller itemWidth={236} ariaLabel={`Más títulos de ${heading}`}>
            {related.map((item) => (
              <Link
                key={item.id}
                className="relative h-[148px] w-[220px] shrink-0 overflow-hidden rounded-lg bg-surface text-white"
                to={hrefFor(item, media)}
              >
                {coverOf(item) ? (
                  <img className="h-full w-full object-cover" src={coverOf(item)} alt="" />
                ) : null}
                <div className="absolute inset-0 bg-linear-to-t from-black to-transparent" />
                <span className="absolute right-2 bottom-2 left-2 line-clamp-2 text-sm font-semibold">{item.titulo}</span>
              </Link>
            ))}
          </HorizontalScroller>
        </section>
      )}

      <section>
        <h2 className={sectionTitleClass}>{media === "serie" ? "Series" : "Películas"}</h2>
        <div className="mx-2 mb-5 flex flex-wrap gap-2">
          {(
            [
              ["popular", "Popular"],
              ["rated", "Mejor valoradas"],
              ["recent", "Más recientes"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={cn(
                "cursor-pointer rounded-full border-0 px-3 py-1.5 text-sm",
                sort === key ? "bg-white text-black" : "bg-surface text-white",
              )}
              onClick={() => setSort(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {lead.map((item, index) => (
            <article key={item.id} className="flex gap-3 rounded-lg bg-surface p-3">
              <Link className="shrink-0" to={hrefFor(item, media)}>
                {item.poster_url ? (
                  <img className="h-[180px] w-[120px] rounded object-cover" src={item.poster_url} alt="" />
                ) : (
                  <div className="flex h-[180px] w-[120px] items-center justify-center rounded bg-surface-alt">🎬</div>
                )}
              </Link>
              <div className="min-w-0">
                <p className="text-xs font-bold text-accent-text">#{index + 1}</p>
                <Link className="text-white hover:text-accent-text" to={hrefFor(item, media)}>
                  <h3 className="text-base font-bold">{item.titulo}</h3>
                </Link>
                <p className={`${metaClass} mt-1`}>
                  {yearOf(item)}
                  {ratingOf(item) ? ` · ★ ${ratingOf(item).toFixed(1)}` : ""}
                  {item.review_count ? ` · ${item.review_count} reseñas` : ""}
                </p>
                {item.sinopsis && <p className="mt-2 line-clamp-5 text-sm text-muted">{item.sinopsis}</p>}
                <button
                  type="button"
                  className="mt-2 border-0 bg-transparent p-0 text-sm text-accent-text"
                  onClick={() => openTrailer(item.id, media)}
                >
                  Ver tráiler
                </button>
              </div>
            </article>
          ))}
        </div>

        {rest.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7">
            {rest.map((item, index) => (
              <Link key={item.id} className="group text-white" to={hrefFor(item, media)}>
                <div className="relative overflow-hidden rounded-lg bg-surface">
                  <span className="absolute top-2 left-2 z-[1] rounded bg-black/70 px-1.5 py-0.5 text-xs font-bold">
                    #{index + 4}
                  </span>
                  {item.poster_url ? (
                    <img className="aspect-2/3 w-full object-cover" src={item.poster_url} alt="" />
                  ) : (
                    <div className="flex aspect-2/3 items-center justify-center bg-surface-alt">🎬</div>
                  )}
                </div>
                <div className="mt-2 truncate text-sm group-hover:text-accent-text">{item.titulo}</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
