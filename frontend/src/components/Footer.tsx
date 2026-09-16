import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { clearRecent, listRecent, type RecentItem } from "../recent";
import { titleHref } from "../ui";

const linkClass = "text-[15px] text-white hover:underline";
const glyph = "inline-flex text-white hover:text-white/70";

export function Footer() {
  const { session } = useAuth();
  const location = useLocation();
  const [recent, setRecent] = useState<RecentItem[]>([]);

  useEffect(() => {
    setRecent(listRecent());
  }, [location.pathname]);

  return (
    <footer className="mt-auto border-t border-white/10 pt-8 pb-10">
      {session && recent.length > 0 && (
        <section className="mb-10">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Visto recientemente</h2>
            <button
              type="button"
              className="cursor-pointer border-0 bg-transparent text-sm text-accent-text"
              onClick={() => {
                clearRecent();
                setRecent([]);
              }}
            >
              Borrar todo
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recent.map((item) => (
              <Link key={`${item.media}-${item.id}`} className="w-[110px] shrink-0 text-white" to={titleHref(item.id, item.media)}>
                {item.poster_url ? (
                  <img className="h-[165px] w-[110px] rounded-md object-cover" src={item.poster_url} alt="" />
                ) : (
                  <div className="flex h-[165px] w-[110px] items-center justify-center rounded-md bg-surface">🎬</div>
                )}
                <span className="mt-1.5 block truncate text-sm">{item.titulo}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mb-6 flex justify-center">
        <Link
          className="inline-flex rounded-full bg-[#f5c518] px-5 py-2.5 text-sm font-bold text-black"
          to={session ? "/inicio" : "/cuenta"}
        >
          {session ? "Sigue explorando el foro" : "Inicia sesión para unirte al foro"}
        </Link>
      </div>

      <div className="mx-auto mb-8 grid w-full max-w-[760px] gap-3 sm:grid-cols-2">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/25 px-6 py-5">
          <p className="mb-3 text-center text-[15px] font-bold">Únete a la comunidad</p>
          <div className="flex items-center gap-4">
            <Link className={glyph} to="/cuenta" aria-label="Cuenta">
              <UserIcon />
            </Link>
            <Link className={glyph} to="/foro/comentadas" aria-label="Más comentadas">
              <ChatIcon />
            </Link>
            <Link className={glyph} to="/foro/valoradas" aria-label="Mejor valoradas">
              <StarIcon />
            </Link>
            <Link className={glyph} to="/peliculas/tendencias" aria-label="Tendencias">
              <TrendIcon />
            </Link>
            <Link className={glyph} to="/series" aria-label="Series">
              <TvIcon />
            </Link>
          </div>
        </div>
        <Link
          className="flex items-center justify-between gap-4 rounded-2xl border border-white/25 px-6 py-5 text-white"
          to="/inicio"
        >
          <div>
            <p className="text-[15px] font-bold">Entra a FOROPELIS</p>
            <p className="mt-1 text-sm text-white/70">Películas, series y reseñas</p>
          </div>
          <span className="grid h-[72px] w-[72px] shrink-0 grid-cols-5 grid-rows-5 gap-px rounded-md bg-white p-1.5" aria-hidden="true">
            {QR_CELLS.map((on, i) => (
              <span key={i} className={on ? "bg-black" : "bg-white"} />
            ))}
          </span>
        </Link>
      </div>

      <nav className="mx-auto mb-6 flex max-w-[720px] flex-wrap justify-center gap-x-6 gap-y-2">
        <Link className={linkClass} to="/inicio">
          Inicio
        </Link>
        <Link className={linkClass} to="/series">
          Series
        </Link>
        <Link className={linkClass} to="/peliculas/cartelera">
          Cartelera
        </Link>
        <Link className={linkClass} to="/peliculas/tendencias">
          Tendencias
        </Link>
        <Link className={linkClass} to="/foro/comentadas">
          Foro
        </Link>
        <Link className={linkClass} to="/foro/valoradas">
          Mejor valoradas
        </Link>
        <Link className={linkClass} to="/cuenta">
          Cuenta
        </Link>
        {session?.isAdmin && (
          <Link className={linkClass} to="/metricas">
            Métricas
          </Link>
        )}
      </nav>
      <p className="m-0 text-center text-[13px] tracking-[0.18em] text-white">FOROPELIS</p>
      <p className="mt-2 mb-0 text-center text-xs text-white/45">Foro de cine y series</p>
    </footer>
  );
}

const QR_CELLS = [
  1, 1, 1, 0, 1,
  1, 0, 1, 0, 1,
  1, 1, 1, 1, 0,
  0, 1, 0, 1, 1,
  1, 0, 1, 1, 1,
];

function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 5h16v11H7l-3 3V5z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3.5 14.4 9l6 .5-4.6 3.9 1.4 5.6L12 16.8 6.8 19l1.4-5.6L3.6 9.5l6-.5z" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 16.5 9 11l3.5 3.5L20 7v4h-2V9.8l-5.5 5.7L9 12 4 17.5z" />
    </svg>
  );
}

function TvIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 7h18v12H3V7zm6-3 3 3 3-3M8 21h8" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
