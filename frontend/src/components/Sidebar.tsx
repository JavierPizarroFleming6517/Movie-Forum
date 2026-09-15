import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { brandClass, cn } from "../ui";

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
  { clave: "tendencias", titulo: "Tendencias" },
  { clave: "mejor_valoradas", titulo: "Mejor valoradas" },
  { clave: "cartelera", titulo: "En cartelera" },
  { clave: "proximos", titulo: "Próximos estrenos" },
];

const FALLBACK_TV: Collection[] = [
  { clave: "populares", titulo: "Populares" },
  { clave: "tendencias", titulo: "Tendencias" },
  { clave: "mejor_valoradas", titulo: "Mejor valoradas" },
  { clave: "en_emision", titulo: "En emisión" },
  { clave: "hoy", titulo: "Hoy" },
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

const headingClass = "mx-4 mb-2 text-[11px] font-semibold tracking-[0.14em] uppercase text-muted";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn("block rounded-md px-3 py-2 text-sm text-white hover:bg-white/10", isActive && "bg-white/15");

export function Sidebar({
  menu,
  open,
  onClose,
}: {
  menu: Menu | null;
  open: boolean;
  onClose: () => void;
}) {
  const { session } = useAuth();
  const location = useLocation();
  const seriesFromUrl = location.pathname === "/series" || location.pathname.startsWith("/series/");
  const [scope, setScope] = useState<"pelicula" | "serie">(seriesFromUrl ? "serie" : "pelicula");
  const [showGenres, setShowGenres] = useState(false);

  useEffect(() => {
    if (!open) return;
    setScope(seriesFromUrl ? "serie" : "pelicula");
    setShowGenres(false);
  }, [open, seriesFromUrl]);

  const movie = menu?.secciones?.find((s) => s.media === "pelicula");
  const tv = menu?.secciones?.find((s) => s.media === "serie");
  const cols = scope === "serie"
    ? (tv?.colecciones?.length ? tv.colecciones : FALLBACK_TV)
    : (movie?.colecciones?.length ? movie.colecciones : FALLBACK_MOVIE);
  const genres = scope === "serie"
    ? (tv?.generos?.length ? tv.generos : FALLBACK_TV_GENRES)
    : (movie?.generos?.length ? movie.generos : FALLBACK_MOVIE_GENRES);
  const home = scope === "serie" ? "/series" : "/catalogo";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 bg-black/60" onClick={onClose}>
      <aside
        className="fixed top-0 bottom-0 left-0 z-[31] w-[320px] overflow-auto bg-header pb-8 max-md:w-[86vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <Link className={brandClass} to="/catalogo" onClick={onClose}>
            FOROPELIS
          </Link>
          <button
            type="button"
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-white hover:bg-white/10"
            aria-label="Cerrar menú"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="mx-4 mb-5 grid grid-cols-2">
          <button
            type="button"
            className={cn(
              "cursor-pointer border-0 bg-transparent py-2.5 text-sm",
              scope === "pelicula" ? "text-white shadow-[inset_0_-2px_0_#fff]" : "text-muted",
            )}
            onClick={() => {
              setScope("pelicula");
              setShowGenres(false);
            }}
          >
            Películas
          </button>
          <button
            type="button"
            className={cn(
              "cursor-pointer border-0 bg-transparent py-2.5 text-sm",
              scope === "serie" ? "text-white shadow-[inset_0_-2px_0_#fff]" : "text-muted",
            )}
            onClick={() => {
              setScope("serie");
              setShowGenres(false);
            }}
          >
            Series
          </button>
        </div>

        <p className={headingClass}>{scope === "serie" ? "Explorar series" : "Explorar películas"}</p>
        <nav className="px-2">
          <NavLink className={linkClass} to={home} onClick={onClose} end>
            Inicio
          </NavLink>
          {cols.map((c) => (
            <NavLink
              key={`${scope}-${c.clave}`}
              className={linkClass}
              to={scope === "serie" ? `/series/${c.clave}` : `/peliculas/${c.clave}`}
              onClick={onClose}
            >
              {c.titulo}
            </NavLink>
          ))}

          <button
            type="button"
            className="mt-2 flex w-full cursor-pointer items-center justify-between rounded-md border-0 bg-transparent px-3 py-2 text-left text-sm text-white hover:bg-white/10"
            onClick={() => setShowGenres((v) => !v)}
          >
            Géneros
            <span className="text-muted">{showGenres ? "▾" : "▸"}</span>
          </button>
          {showGenres &&
            genres.map((g) => (
              <NavLink
                key={`${scope}-${g.id}`}
                className={linkClass}
                to={
                  scope === "serie"
                    ? `/series/genero/${g.id}?nombre=${encodeURIComponent(g.nombre)}`
                    : `/genero/${g.id}?nombre=${encodeURIComponent(g.nombre)}`
                }
                onClick={onClose}
              >
                {g.nombre}
              </NavLink>
            ))}
        </nav>

        <div className="mt-5 border-t border-divider pt-4">
          <p className={headingClass}>Comunidad</p>
          <div className="px-2">
            <NavLink className={linkClass} to="/foro/comentadas" onClick={onClose}>
              Más comentadas
            </NavLink>
            <NavLink className={linkClass} to="/foro/valoradas" onClick={onClose}>
              Mejor valoradas
            </NavLink>
            {session?.isAdmin && (
              <NavLink className={linkClass} to="/metricas" onClick={onClose}>
                Métricas
              </NavLink>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
