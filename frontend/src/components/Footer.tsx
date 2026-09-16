import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { cn, shellClass } from "../ui";
import { Brand } from "./Brand";

const colLink = "my-1 block text-muted";

export function Footer() {
  const { session } = useAuth();
  return (
    <footer className="mt-auto w-full bg-footer">
      <div className={cn(shellClass, "flex flex-wrap justify-between gap-8 py-7")}>
      <div className="max-w-[260px] min-w-[140px]">
        <div className="mb-4">
          <Brand />
        </div>
        <Link
          className="inline-block rounded-md bg-accent-text px-3.5 py-2.5 text-xs font-bold text-footer"
          to="/cuenta"
        >
          ÚNETE A LA COMUNIDAD
        </Link>
      </div>
      <div className="max-w-[260px] min-w-[140px]">
        <h4 className="mb-2 font-bold">LO BÁSICO</h4>
        <Link className={colLink} to="/inicio">
          Inicio
        </Link>
        <Link className={colLink} to="/series">
          Series
        </Link>
      </div>
      <div className="max-w-[260px] min-w-[140px]">
        <h4 className="mb-2 font-bold">COMUNIDAD</h4>
        <Link className={colLink} to="/foro/comentadas">
          Las más comentadas
        </Link>
        <Link className={colLink} to="/foro/valoradas">
          Mejor valoradas por la comunidad
        </Link>
        <Link className={colLink} to="/cuenta">
          Acceder
        </Link>
        {session?.isAdmin && (
          <Link className={colLink} to="/metricas">
            Métricas
          </Link>
        )}
        <Link className={colLink} to="/inicio">
          Escribe una reseña
        </Link>
      </div>
      <div className="max-w-[260px] min-w-[140px]">
        <h4 className="mb-2 font-bold">EXPLORA</h4>
        <Link className={colLink} to="/peliculas/cartelera">
          Cartelera
        </Link>
        <Link className={colLink} to="/peliculas/tendencias">
          Tendencias
        </Link>
        <Link className={colLink} to="/peliculas/mejor_valoradas">
          Mejor valoradas
        </Link>
      </div>
      </div>
    </footer>
  );
}
