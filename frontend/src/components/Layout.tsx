import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { brandClass, cn, ghostBtnClass } from "../ui";
import { AccountMenu } from "./AccountMenu";
import { Footer } from "./Footer";
import { Sidebar } from "./Sidebar";

export function Layout() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menu, setMenu] = useState<any>(null);
  const [query, setQuery] = useState("");
  const [hints, setHints] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestBox, setSuggestBox] = useState<{ top: number; left: number; width: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.menu().then(setMenu).catch(() => setMenu(null));
  }, []);

  useEffect(() => {
    setLoading(true);
    setHints([]);
    const id = window.setTimeout(() => setLoading(false), 250);
    return () => window.clearTimeout(id);
  }, [location.pathname, location.search]);

  useLayoutEffect(() => {
    if (hints.length === 0) {
      setSuggestBox(null);
      return;
    }
    function place() {
      const el = searchInput.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setSuggestBox({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [hints, query]);

  function onSearchChange(value: string) {
    setQuery(value);
    window.clearTimeout(timer.current);
    if (value.trim().length < 2) {
      setHints([]);
      return;
    }
    timer.current = window.setTimeout(() => {
      api.search(value.trim()).then((data) => setHints((data.results || []).slice(0, 8))).catch(() => setHints([]));
    }, 250);
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const text = query.trim();
    setHints([]);
    if (text) navigate(`/buscar?q=${encodeURIComponent(text)}`);
    else navigate("/catalogo");
  }

  return (
    <div
      className={cn(
        "relative flex min-h-screen max-w-full flex-col overflow-x-hidden",
        location.pathname === "/cuenta" && !session && "h-screen overflow-hidden",
      )}
    >
      <header className="sticky top-0 z-20 flex h-[70px] min-w-0 items-center gap-3 overflow-visible bg-header px-4">
        <div className="flex min-w-0 shrink items-center gap-2.5">
          <button className={ghostBtnClass} type="button" onClick={() => setMenuOpen(true)}>
            <MenuIcon />
            Menú
          </button>
          <Link className={brandClass} to="/catalogo">
            FOROPELIS
          </Link>
        </div>
        <form id="search-form" className="relative flex min-w-0 flex-1 basis-44" onSubmit={submitSearch}>
          <input
            ref={searchInput}
            className="search-input h-[42px] min-w-0 flex-1 rounded-md border border-white py-0 pr-3 pl-9 text-neutral-900"
            placeholder="Buscar películas"
            value={query}
            autoComplete="off"
            onChange={(e) => onSearchChange(e.target.value)}
            onBlur={() => window.setTimeout(() => setHints([]), 200)}
          />
        </form>
        <div className="ml-auto flex min-w-0 shrink items-center gap-2.5">
          <button
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-white hover:bg-white/10"
            type="submit"
            form="search-form"
            aria-label="Buscar"
          >
            <SearchIcon />
          </button>
          <AccountMenu />
        </div>
      </header>
      {hints.length > 0 &&
        suggestBox &&
        createPortal(
          <div
            className="fixed z-40 max-h-[min(360px,calc(100vh-90px))] overflow-auto rounded-md bg-surface shadow-lg"
            style={{ top: suggestBox.top, left: suggestBox.left, width: suggestBox.width }}
            role="listbox"
          >
            {hints.map((item) => (
              <Link
                key={item.id}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-surface-alt"
                to={`/pelicula/${item.id}`}
                onMouseDown={(e) => e.preventDefault()}
                role="option"
              >
                {item.poster_url ? (
                  <img className="h-12 w-8 shrink-0 rounded-sm object-cover" src={item.poster_url} width={32} height={48} alt="" />
                ) : (
                  <span className="h-12 w-8 shrink-0 rounded-sm bg-surface-alt" />
                )}
                <span className="min-w-0 truncate">
                  {item.titulo}
                  {item.fecha_estreno ? ` (${String(item.fecha_estreno).slice(0, 4)})` : ""}
                </span>
              </Link>
            ))}
          </div>,
          document.body,
        )}
      <Sidebar menu={menu} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {loading && (
          <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-4 bg-bg">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-neutral-700 border-t-accent-text" />
            <div>Cargando</div>
          </div>
        )}
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
      <path d="M16 16l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
