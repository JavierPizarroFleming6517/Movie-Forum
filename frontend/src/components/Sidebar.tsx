import { useMemo, useState } from "react";
import { Link, NavLink, useLocation, useSearchParams } from "react-router-dom";
import { brandClass, cn, metaClass } from "../ui";

type Collection = { clave: string; titulo: string };
type Genre = { id: number; nombre: string };
type Menu = {
  secciones?: {
    media: string;
    colecciones: Collection[];
    generos: Genre[];
  }[];
};

const FALLBACK_MOVIE: Collection[] = [
  { clave: "populares", titulo: "Las más populares" },
  { clave: "tendencias", titulo: "Tendencias de la semana" },
  { clave: "mejor_valoradas", titulo: "Mejor valoradas" },
  { clave: "cartelera", titulo: "En cartelera" },
  { clave: "proximos", titulo: "Próximos estrenos" },
];

const FALLBACK_TV: Collection[] = [
  { clave: "populares", titulo: "Series populares" },
  { clave: "tendencias", titulo: "Series en tendencia" },
  { clave: "mejor_valoradas", titulo: "Series mejor valoradas" },
  { clave: "en_emision", titulo: "En emisión" },
  { clave: "hoy", titulo: "Hoy en televisión" },
];

const FALLBACK_MOVIE_GENRES: Genre[] = [
  { id: 28, nombre: "Acción" },
  { id: 16, nombre: "Animación" },
  { id: 12, nombre: "Aventura" },
  { id: 10752, nombre: "Bélica" },
  { id: 878, nombre: "Ciencia ficción" },
  { id: 35, nombre: "Comedia" },
  { id: 80, nombre: "Crimen" },
  { id: 99, nombre: "Documental" },
  { id: 18, nombre: "Drama" },
  { id: 10751, nombre: "Familia" },
  { id: 14, nombre: "Fantasía" },
  { id: 36, nombre: "Historia" },
  { id: 9648, nombre: "Misterio" },
  { id: 10402, nombre: "Música" },
  { id: 10770, nombre: "Película de TV" },
  { id: 10749, nombre: "Romance" },
  { id: 53, nombre: "Suspense" },
  { id: 27, nombre: "Terror" },
  { id: 37, nombre: "Western" },
];

const FALLBACK_TV_GENRES: Genre[] = [
  { id: 10759, nombre: "Acción y aventura" },
  { id: 16, nombre: "Animación" },
  { id: 35, nombre: "Comedia" },
  { id: 80, nombre: "Crimen" },
  { id: 99, nombre: "Documental" },
  { id: 18, nombre: "Drama" },
  { id: 10751, nombre: "Familia" },
  { id: 10762, nombre: "Infantil" },
  { id: 9648, nombre: "Misterio" },
  { id: 10763, nombre: "Noticias" },
  { id: 10764, nombre: "Telerrealidad" },
  { id: 10765, nombre: "Ciencia ficción y fantasía" },
  { id: 10766, nombre: "Telenovela" },
  { id: 10767, nombre: "Entrevistas" },
  { id: 10768, nombre: "Bélica y política" },
  { id: 37, nombre: "Western" },
];

const TINTS = ["#6BA3D6", "#7FB8A8", "#C9A66B", "#A98FD6", "#D68F9C", "#8FA9D6"];

const COLLECTION_ICON: Record<string, string> = {
  populares: "🔥",
  tendencias: "📈",
  mejor_valoradas: "★",
  cartelera: "🎬",
  proximos: "📅",
  en_emision: "📡",
  hoy: "📆",
};

const entryClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "mx-2 mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-white hover:bg-white/10",
    isActive && "bg-accent hover:bg-accent",
  );

const chipClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "rounded-[18px] border border-transparent bg-surface-alt px-3.5 py-2 text-sm",
    isActive && "border-accent-text bg-accent text-white",
  );

export function Sidebar({
  menu,
  open,
  onClose,
}: {
  menu: Menu | null;
  open: boolean;
  onClose: () => void;
}) {
  const location = useLocation();
  const [params] = useSearchParams();
  const [openMovies, setOpenMovies] = useState(true);
  const [openTv, setOpenTv] = useState(false);
  const [openMovieGenres, setOpenMovieGenres] = useState(true);
  const [openTvGenres, setOpenTvGenres] = useState(false);

  const movie = menu?.secciones?.find((s) => s.media === "pelicula");
  const tv = menu?.secciones?.find((s) => s.media === "serie");
  const movieCols = movie?.colecciones?.length ? movie.colecciones : FALLBACK_MOVIE;
  const tvCols = tv?.colecciones?.length ? tv.colecciones : FALLBACK_TV;
  const movieGenres = movie?.generos?.length ? movie.generos : FALLBACK_MOVIE_GENRES;
  const tvGenres = tv?.generos?.length ? tv.generos : FALLBACK_TV_GENRES;

  const viewing = useMemo(() => viewingLabel(location.pathname, params, movieCols, tvCols), [location.pathname, params, movieCols, tvCols]);
  const moviesActive = !location.pathname.startsWith("/series");
  const seriesActive = location.pathname === "/series" || location.pathname.startsWith("/series/");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 bg-black/60" onClick={onClose}>
      <aside className="fixed top-0 bottom-0 left-0 z-[31] w-[400px] overflow-auto bg-header pb-6 max-md:w-[86vw]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between py-3 pr-3 pl-4">
          <Link className={brandClass} to="/catalogo" onClick={onClose}>
            FOROPELIS
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-white hover:bg-white/10"
            aria-label="Cerrar menú"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2.5">
          <span className="h-10 w-1 rounded-sm bg-accent-text" />
          <div>
            <div className="text-xs font-semibold tracking-wide text-muted">VIENDO AHORA</div>
            <div className="text-base font-semibold">{viewing}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 px-3 pt-2 pb-3.5">
          <Link
            className={cn(
              "flex flex-col gap-1 rounded-[10px] border border-divider bg-surface px-3.5 py-3",
              moviesActive && "border-accent-text bg-accent",
            )}
            to="/catalogo"
            onClick={onClose}
          >
            <span className="text-xl">🎬</span>
            <strong>Películas</strong>
            <span className={metaClass}>{movieGenres.length} géneros</span>
          </Link>
          <Link
            className={cn(
              "flex flex-col gap-1 rounded-[10px] border border-divider bg-surface px-3.5 py-3",
              seriesActive && "border-accent-text bg-accent",
            )}
            to="/series"
            onClick={onClose}
          >
            <span className="text-xl">📺</span>
            <strong>Series</strong>
            <span className={metaClass}>{tvGenres.length} géneros</span>
          </Link>
        </div>

        <SectionToggle
          icon="🎬"
          title="Películas"
          subtitle={`${movieCols.length} listas · ${movieGenres.length} géneros`}
          open={openMovies}
          onClick={() => setOpenMovies((v) => !v)}
        />
        {openMovies && (
          <div className="px-2 pb-2">
            {movieCols.map((c) => (
              <NavLink key={c.clave} className={entryClass} to={`/peliculas/${c.clave}`} onClick={onClose}>
                <span>{COLLECTION_ICON[c.clave] || "▶"}</span>
                {c.titulo}
              </NavLink>
            ))}
            <SectionToggle
              nested
              icon="▦"
              title="Categorías"
              subtitle={`${movieGenres.length} géneros`}
              open={openMovieGenres}
              onClick={() => setOpenMovieGenres((v) => !v)}
            />
            {openMovieGenres && (
              <div className="flex flex-wrap gap-2 px-3 py-2 pb-3">
                {movieGenres.map((g, i) => (
                  <NavLink
                    key={g.id}
                    className={chipClass}
                    to={`/genero/${g.id}?nombre=${encodeURIComponent(g.nombre)}`}
                    onClick={onClose}
                    style={{ color: TINTS[i % TINTS.length] }}
                  >
                    {g.nombre}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}

        <SectionToggle
          icon="📺"
          title="Series"
          subtitle={`${tvCols.length} listas · ${tvGenres.length} géneros`}
          open={openTv}
          onClick={() => setOpenTv((v) => !v)}
        />
        {openTv && (
          <div className="px-2 pb-2">
            {tvCols.map((c) => (
              <NavLink key={c.clave} className={entryClass} to={`/series/${c.clave}`} onClick={onClose}>
                <span>{COLLECTION_ICON[c.clave] || "▶"}</span>
                {c.titulo}
              </NavLink>
            ))}
            <SectionToggle
              nested
              icon="▦"
              title="Géneros de TV"
              subtitle={`${tvGenres.length} géneros`}
              open={openTvGenres}
              onClick={() => setOpenTvGenres((v) => !v)}
            />
            {openTvGenres && (
              <div className="flex flex-wrap gap-2 px-3 py-2 pb-3">
                {tvGenres.map((g, i) => (
                  <NavLink
                    key={g.id}
                    className={chipClass}
                    to={`/series/genero/${g.id}?nombre=${encodeURIComponent(g.nombre)}`}
                    onClick={onClose}
                    style={{ color: TINTS[i % TINTS.length] }}
                  >
                    {g.nombre}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-2 border-t border-divider pt-2">
          <h3 className="mx-4 mt-3 mb-1.5 flex items-center gap-2 text-[17px]">Comunidad</h3>
          <NavLink className={entryClass} to="/foro/comentadas" onClick={onClose}>
            <span>💬</span> Las más comentadas
          </NavLink>
          <NavLink className={entryClass} to="/foro/valoradas" onClick={onClose}>
            <span>★</span> Mejor valoradas por la comunidad
          </NavLink>
          <NavLink className={entryClass} to="/cuenta" onClick={onClose}>
            <span>👤</span> Cuenta
          </NavLink>
          <NavLink className={entryClass} to="/metricas" onClick={onClose}>
            <span>📊</span> Métricas
          </NavLink>
        </div>
      </aside>
    </div>
  );
}

function SectionToggle({
  icon,
  title,
  subtitle,
  open,
  nested,
  onClick,
}: {
  icon: string;
  title: string;
  subtitle: string;
  open: boolean;
  nested?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "mx-1 flex w-[calc(100%-8px)] cursor-pointer items-center gap-2.5 border-0 bg-transparent py-3 pr-4 text-left text-white",
        nested ? "pl-6" : "pl-4",
      )}
      onClick={onClick}
    >
      <span>{icon}</span>
      <span className="flex flex-1 flex-col">
        <strong>{title}</strong>
        <em className="text-[13px] not-italic text-muted">{subtitle}</em>
      </span>
      <span className="text-muted">{open ? "▾" : "▸"}</span>
    </button>
  );
}

function viewingLabel(
  pathname: string,
  params: URLSearchParams,
  movieCols: Collection[],
  tvCols: Collection[],
) {
  if (pathname.startsWith("/cuenta")) return "Tu cuenta";
  if (pathname.startsWith("/metricas")) return "Métricas del foro";
  if (pathname.startsWith("/buscar")) return `Búsqueda: "${params.get("q") || ""}"`;
  if (pathname.startsWith("/foro/comentadas")) return "Las más comentadas";
  if (pathname.startsWith("/foro/valoradas")) return "Mejor valoradas por la comunidad";
  if (pathname.startsWith("/pelicula/")) return "Ficha de película";
  const movieCol = pathname.match(/^\/peliculas\/([^/]+)/);
  if (movieCol) return movieCols.find((c) => c.clave === movieCol[1])?.titulo || movieCol[1];
  const tvCol = pathname.match(/^\/series\/([^/]+)/);
  if (tvCol && tvCol[1] !== "genero") return tvCols.find((c) => c.clave === tvCol[1])?.titulo || tvCol[1];
  if (pathname.startsWith("/genero/") || pathname.startsWith("/series/genero/")) {
    return params.get("nombre") || "Género";
  }
  if (pathname.startsWith("/series")) return "Inicio · Series";
  return "Inicio · Películas";
}
