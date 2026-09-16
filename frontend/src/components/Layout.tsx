import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { cn, ghostBtnClass, shellClass } from "../ui";
import { AccountMenu } from "./AccountMenu";
import { Brand } from "./Brand";
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
  const [suggestBox, setSuggestBox] = useState<{ top: number; left: number; width: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.menu().then(setMenu).catch(() => setMenu(null));
  }, []);

  useEffect(() => {
    setHints([]);
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
    else navigate("/inicio");
  }

  return (
    <div
      className={cn(
        "relative flex min-h-screen max-w-full flex-col overflow-x-hidden",
        location.pathname === "/cuenta" && !session && "h-screen overflow-hidden",
      )}
    >
      <header className="sticky top-0 z-20 overflow-visible bg-header">
        <div className={cn(shellClass, "flex h-[70px] min-w-0 items-center gap-4")}>
          <Brand />
          <button className={ghostBtnClass} type="button" onClick={() => setMenuOpen(true)}>
            <MenuIcon />
            Menú
          </button>
          <form id="search-form" className="relative mx-2 flex min-w-0 flex-1 basis-44" onSubmit={submitSearch}>
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
            <AccountMenu />
          </div>
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
