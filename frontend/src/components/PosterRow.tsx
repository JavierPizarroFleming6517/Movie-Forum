import { type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { hoverLiftClass, metaClass, sectionTitleClass, titleHref } from "../ui";
import { HorizontalScroller } from "./HorizontalScroller";

type Item = {
  id: number;
  titulo?: string;
  poster_url?: string | null;
  valoracion?: number | null;
  average_rating?: number | null;
  fecha_estreno?: string | null;
};

const cardBtn =
  "inline-flex cursor-pointer items-center justify-center rounded-3xl bg-accent px-3 py-2 text-[13px] font-semibold text-white hover:bg-accent-hover";
const cardBtnGhost =
  "inline-flex cursor-pointer items-center justify-center rounded-3xl border border-neutral-700 bg-transparent px-2.5 py-1.5 text-xs font-semibold text-white";

export function PosterCard({
  item,
  media = "pelicula",
}: {
  item: Item;
  media?: "pelicula" | "serie";
}) {
  const rating = item.average_rating ?? item.valoracion;
  const year = (item.fecha_estreno || "").slice(0, 4);
  const href = titleHref(item.id, media);

  async function openTrailer(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    try {
      const data = await api.trailer(item.id, media);
      if (data?.url) window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      /* tráiler opcional */
    }
  }

  return (
    <article className={`w-[210px] shrink-0 overflow-hidden rounded-[10px] bg-surface text-white shadow-[0_3px_6px_#0006] ${hoverLiftClass}`}>
      <Link className="block" to={href}>
        {item.poster_url ? (
          <img className="h-[315px] w-[210px] rounded-t-lg bg-surface-alt object-cover" src={item.poster_url} alt={item.titulo || ""} />
        ) : (
          <div className="flex h-[315px] w-[210px] items-center justify-center rounded-t-lg bg-surface-alt text-4xl">🎬</div>
        )}
      </Link>
      <div className="grid gap-1.5 px-3 pt-2.5 pb-3">
        <div className="flex items-center gap-1 text-sm">
          <span className="text-accent-text">★</span>
          <span>{rating ? Number(rating).toFixed(1) : "—"}</span>
          {year ? <span className={metaClass}> · {year}</span> : null}
        </div>
        <div className="min-h-[2.6em] overflow-hidden text-sm font-semibold leading-snug">{item.titulo}</div>
        <Link className={cardBtn} to={href}>
          Ver ficha
        </Link>
        <button type="button" className={cardBtnGhost} onClick={openTrailer}>
          Ver tráiler
        </button>
      </div>
    </article>
  );
}

export function PosterRow({
  title,
  items,
  media = "pelicula",
}: {
  title: string;
  items: Item[];
  media?: "pelicula" | "serie";
}) {
  if (!items?.length) return null;
  return (
    <section className="mt-2">
      <h2 className={sectionTitleClass}>{title}</h2>
      <HorizontalScroller itemWidth={226} ariaLabel={title}>
        {items.map((item) => (
          <PosterCard key={`${media}-${item.id}`} item={item} media={media} />
        ))}
      </HorizontalScroller>
    </section>
  );
}
