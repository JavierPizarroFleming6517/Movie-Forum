import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { MetricsResponse } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { LoadingScreen } from "../components/LoadingScreen";
import { forumStars } from "../components/StarRating";
import {
  EngagementCharts,
  EngagementKpis,
  ModerationKpis,
  RangeNote,
  RangePicker,
  ReportsCharts,
} from "../components/metrics/MetricsCharts";
import { ReportsPanel } from "../components/metrics/ReportsPanel";
import { metaClass, pageClass } from "../ui";

export function MetricsPage() {
  const { session } = useAuth();
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(session?.isAdmin));
  const [days, setDays] = useState(0);

  const load = useCallback((range: number) => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .metrics(range || undefined)
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
  }, []);

  useEffect(() => {
    if (!session?.isAdmin) {
      setData(null);
      setLoading(false);
      return;
    }
    return load(days);
  }, [session?.isAdmin, days, load]);

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
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-[30px]">Métricas</h1>
          <p className="mb-0 text-[13px] text-muted">Salud de la moderación y actividad del foro</p>
        </div>
        <RangePicker value={days} onChange={setDays} />
      </div>

      {error && <p className="mb-4 text-[#ff8a80]">{error}</p>}

      {data && (
        <>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-xl">Moderación</h2>
            <RangeNote days={data.range_days} granularity={data.timeline_granularity} />
          </div>
          <ModerationKpis data={data.moderation} />
          <div className="mt-4">
            <ReportsCharts data={data.moderation} granularity={data.timeline_granularity} />
          </div>

          <div className="mt-8 mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-xl">Actividad del foro</h2>
            <RangeNote days={data.range_days} granularity={data.timeline_granularity} />
          </div>
          <EngagementKpis data={data.engagement} />
          <div className="mt-4">
            <EngagementCharts data={data.engagement} granularity={data.timeline_granularity} />
          </div>

          <h2 className="mt-8 mb-3 text-xl">Top 10 por calificación</h2>
          {data.top_titles.map((item) => (
            <article className="mb-3 rounded-lg bg-surface p-4" key={item.id}>
              <strong>{item.title}</strong>
              <div className={metaClass}>
                {forumStars(item.average_rating)}/5 · {item.review_count} reseñas
              </div>
            </article>
          ))}
        </>
      )}

      <div className="mt-8">
        <ReportsPanel />
      </div>
    </div>
  );
}