import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { forumStars } from "./StarRating";
import { cn, ghostBtnClass, metaClass } from "../ui";

export function AccountMenu() {
  const { session, clear } = useAuth();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [box, setBox] = useState<{ top: number; right: number } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || !session) return;
    let cancelled = false;
    Promise.all([api.me(), api.myReviews()])
      .then(([me, mine]) => {
        if (cancelled) return;
        setProfile(me);
        setReviews(Array.isArray(mine) ? mine : []);
      })
      .catch(() => {
        if (cancelled) return;
        setProfile({ username: session.username, id: session.id, is_admin: session.isAdmin });
        setReviews([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, session]);

  useLayoutEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }
    function place() {
      const el = button.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setBox({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      const target = event.target as Node;
      if (wrap.current?.contains(target) || panel.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!session) {
    return (
      <Link className={cn(ghostBtnClass, "whitespace-nowrap")} to="/cuenta">
        <PersonIcon />
        Iniciar sesión
      </Link>
    );
  }

  const name = profile?.username || session.username;
  const initial = (name || "U").slice(0, 1).toUpperCase();
  const avg =
    reviews.length > 0
      ? Math.round((reviews.reduce((sum, r) => sum + forumStars(r.rating), 0) / reviews.length) * 10) / 10
      : null;
  const isAdmin = Boolean(profile?.is_admin || session.isAdmin);

  return (
    <div className="relative" ref={wrap}>
      <button
        ref={button}
        type="button"
        className={cn(ghostBtnClass, "whitespace-nowrap")}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <PersonIcon />
        {name}
      </button>
      {open &&
        box &&
        createPortal(
          <div
            ref={panel}
            className="fixed z-40 w-[280px] overflow-hidden rounded-lg bg-surface shadow-[0_12px_32px_#000a]"
            style={{ top: box.top, right: box.right }}
            role="menu"
          >
            <div className="flex items-center gap-3 border-b border-divider px-4 py-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg font-semibold">
                {initial}
              </div>
              <div className="min-w-0">
                <div className="truncate font-semibold">{name}</div>
                <p className={`${metaClass} truncate`}>{profile?.email || "Miembro del foro"}</p>
                {isAdmin && <p className="mt-0.5 text-[11px] tracking-wide text-muted uppercase">Administrador</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-px bg-divider">
              <Stat label="Reseñas" value={String(reviews.length)} />
              <Stat label="Promedio" value={avg != null ? `${avg}/5` : "—"} />
            </div>
            <p className={`${metaClass} px-4 py-2`}>Miembro desde {formatJoined(profile?.created_at)}</p>
            <div className="border-t border-divider p-1.5">
              <Link className={menuItemClass} to="/cuenta" role="menuitem" onClick={() => setOpen(false)}>
                Ver perfil
              </Link>
              {isAdmin && (
                <Link className={menuItemClass} to="/metricas" role="menuitem" onClick={() => setOpen(false)}>
                  Métricas
                </Link>
              )}
              <button
                type="button"
                className={`${menuItemClass} w-full`}
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  clear();
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

const menuItemClass =
  "block cursor-pointer rounded-md border-0 bg-transparent px-3 py-2 text-left text-sm text-white hover:bg-white/10";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-4 py-2.5">
      <div className={metaClass}>{label}</div>
      <b className="mt-0.5 block text-sm">{value}</b>
    </div>
  );
}

function formatJoined(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

function PersonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
      <path d="M5 19c1.2-3.2 3.6-5 7-5s5.8 1.8 7 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
