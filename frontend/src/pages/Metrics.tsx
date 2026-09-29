import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { LoadingScreen } from "../components/LoadingScreen";
import { ReportsPanel } from "../components/metrics/ReportsPanel";
import { forumStars } from "../components/StarRating";
import { metaClass, pageClass } from "../ui";

export function MetricsPage() {
  const { session } = useAuth();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(session?.isAdmin));

  useEffect(() => {
    if (!session?.isAdmin) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .metrics()
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "No se pudieron cargar las métricas");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.isAdmin]);

  if (!session?.isAdmin) {
    return (
      <div className={pageClass}>
        <h1 className="mb-1 text-[30px]">Métricas</h1>
        <p className="mb-4 text-[13px] text-muted">Esta sección es solo para administradores.</p>
        <Link className="text-accent-text" to={session ? "/inicio" : "/cuenta"}>
          {session ? "Volver al inicio" : "Iniciar sesión"}
        </Link>
      </div>
    );
  }

  if (loading) return <LoadingScreen />;

  return (
    <div className={pageClass}>
      <h1 className="mb-1 text-[30px]">Métricas</h1>
      <p className="mb-6 text-[13px] text-muted">Actividad del foro</p>
      {error && <p className="text-[#ff8a80]">{error}</p>}
      {data && (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="w-[180px] rounded-lg bg-surface p-5">
              Usuarios<b className="mt-1 block text-[28px]">{data.users}</b>
            </div>
            <div className="w-[180px] rounded-lg bg-surface p-5">
              Títulos<b className="mt-1 block text-[28px]">{data.titles}</b>
            </div>
            <div className="w-[180px] rounded-lg bg-surface p-5">
              Reseñas<b className="mt-1 block text-[28px]">{data.reviews}</b>
            </div>
            <div className="w-[180px] rounded-lg bg-surface p-5">
              Promedio<b className="mt-1 block text-[28px]">{data.global_average_rating != null ? `${forumStars(data.global_average_rating)}/5` : "—"}</b>
            </div>
          </div>
          <h2 className="mt-6 mb-3 text-xl">Top 10 por calificación</h2>
          {(data.top_titles || []).map((item: any) => (
            <article className="mb-3 rounded-lg bg-surface p-4" key={item.id}>
              <strong>{item.title}</strong>
              <div className={metaClass}>
                {forumStars(item.average_rating)}/5 · {item.review_count} reseñas
              </div>
            </article>
          ))}
        </>
      )}
      <ReportsPanel />
    </div>
  );
}
