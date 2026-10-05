import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MetricsResponse, TimelineGranularity } from "../../api/client";
import { ghostBtnClass, metaClass } from "../../ui";
import {
  axisProps,
  CHART_COLORS,
  ChartCard,
  EmptyChart,
  tooltipStyle,
} from "./ChartCard";

const REPORT_TYPE_LABELS: Record<string, string> = {
  spam: "Spam",
  offensive: "Ofensivo",
  spoiler: "Spoiler",
  other: "Otro",
};

const REPORT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendientes",
  dismissed: "Descartados",
  action_taken: "Con acción",
};

const ACTION_LABELS: Record<string, string> = {
  warn: "Advertencia",
  delete_content: "Eliminado",
  ban_temp: "Ban temporal",
  ban_perm: "Ban permanente",
};

const RANGE_OPTIONS = [
  { value: 0, label: "Todo el historial" },
  { value: 7, label: "Últimos 7 días" },
  { value: 30, label: "Últimos 30 días" },
  { value: 90, label: "Últimos 90 días" },
];

const MONTH_NAMES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/** Daily buckets arrive as YYYY-MM-DD, monthly ones as YYYY-MM. */
function formatBucket(iso: string, granularity: TimelineGranularity | null) {
  const [year, month, day] = iso.split("-");
  if (granularity === "month" || !day) {
    return `${MONTH_NAMES[Number(month) - 1] ?? month} ${year.slice(2)}`;
  }
  return `${day}/${month}`;
}

function PercentBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted">—</span>;
  return <span>{value}%</span>;
}

export function RangePicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (days: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Rango de fechas">
      {RANGE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          className={`${ghostBtnClass} rounded-lg ${
            value === option.value ? "bg-accent text-white" : "text-muted"
          }`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ModerationKpis({ data }: { data: MetricsResponse["moderation"] }) {
  const tiles = [
    { label: "Reportes pendientes", value: String(data.pending_reports) },
    { label: "Resueltos", value: String(data.resolved_reports) },
    { label: "Tasa de resolución", value: <PercentBadge value={data.resolution_rate} /> },
    {
      label: "Tiempo medio de resolución",
      value: data.avg_resolution_hours == null ? "—" : `${data.avg_resolution_hours} h`,
    },
    { label: "Sanciones activas", value: String(data.active_bans) },
  ];
  return (
    <div className="flex flex-wrap gap-3">
      {tiles.map((tile) => (
        <div className="min-w-[170px] rounded-lg bg-surface px-5 py-4" key={tile.label}>
          <div className={metaClass}>{tile.label}</div>
          <b className="mt-1 block text-[22px]">{tile.value}</b>
        </div>
      ))}
    </div>
  );
}

export function EngagementKpis({ data }: { data: MetricsResponse["engagement"] }) {
  const tiles = [
    { label: "Reseñas", value: String(data.reviews) },
    { label: "Respuestas", value: String(data.replies) },
    { label: "Usuarios activos", value: String(data.active_users) },
    {
      label: "Promedio global",
      value: data.global_average_rating == null ? "—" : `${data.global_average_rating}/5`,
    },
  ];
  return (
    <div className="flex flex-wrap gap-3">
      {tiles.map((tile) => (
        <div className="min-w-[170px] rounded-lg bg-surface px-5 py-4" key={tile.label}>
          <div className={metaClass}>{tile.label}</div>
          <b className="mt-1 block text-[22px]">{tile.value}</b>
        </div>
      ))}
    </div>
  );
}

export function ReportsCharts({
  data,
  granularity,
}: {
  data: MetricsResponse["moderation"];
  granularity: TimelineGranularity | null;
}) {
  const byType = data.reports_by_type.map((row) => ({
    label: REPORT_TYPE_LABELS[row.type] ?? row.type,
    value: row.count,
  }));
  const byStatus = data.reports_by_status
    .map((row) => ({ label: REPORT_STATUS_LABELS[row.status] ?? row.status, value: row.count }))
    .filter((row) => row.value > 0);
  const byAction = data.actions_by_type.map((row) => ({
    label: ACTION_LABELS[row.type] ?? row.type,
    value: row.count,
  }));
  const timeline = data.reports_timeline.map((point) => ({
    label: formatBucket(point.date, granularity),
    Reportes: point.value,
  }));

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Reportes por tipo" hint="Motivos más señalados">
          {byType.every((row) => row.value === 0) ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byType} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#ffffff10" }} />
                <Bar dataKey="value" name="Reportes" radius={[6, 6, 0, 0]}>
                  {byType.map((row, index) => (
                    <Cell key={row.label} fill={CHART_COLORS.series[index % CHART_COLORS.series.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Estado de los reportes">
          {byStatus.length === 0 ? (
            <EmptyChart message="Todavía no hay reportes" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byStatus}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="52%"
                  paddingAngle={2}
                  stroke={CHART_COLORS.tooltipBg}
                >
                  {byStatus.map((row, index) => (
                    <Cell key={row.label} fill={CHART_COLORS.series[index % CHART_COLORS.series.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Acciones de moderación aplicadas">
          {byAction.every((row) => row.value === 0) ? (
            <EmptyChart message="Sin acciones registradas" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byAction} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" {...axisProps} interval={0} angle={-12} height={54} textAnchor="end" />
                <YAxis allowDecimals={false} {...axisProps} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#ffffff10" }} />
                <Bar dataKey="value" name="Acciones" radius={[6, 6, 0, 0]} fill={CHART_COLORS.series[1]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title={granularity === "month" ? "Reportes por mes" : "Reportes por día"}
          hint={granularity === "month" ? "Histórico completo agrupado por mes" : "Actividad del periodo seleccionado"}
        >
          {timeline.length === 0 ? (
            <EmptyChart message="Todavía no hay reportes registrados" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" {...axisProps} minTickGap={18} />
                <YAxis allowDecimals={false} {...axisProps} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="Reportes"
                  stroke={CHART_COLORS.series[0]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {data.top_reported_titles.length > 0 && (
        <div className="mt-4 rounded-lg bg-surface p-5">
          <h3 className="text-[15px] font-semibold">Títulos más reportados</h3>
          <div className={metaClass}>Contenido que más reportes recibió en el periodo</div>
          <div className="mt-3 overflow-x-auto rounded-lg border border-divider">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-divider bg-bg/80">
                  <th className="px-3 py-2 text-left">Título</th>
                  <th className="px-3 py-2 text-right">Reportes</th>
                </tr>
              </thead>
              <tbody>
                {data.top_reported_titles.map((row) => (
                  <tr className="border-b border-divider/50" key={row.id}>
                    <td className="px-3 py-2">{row.title}</td>
                    <td className="px-3 py-2 text-right">{row.report_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

export function EngagementCharts({
  data,
  granularity,
}: {
  data: MetricsResponse["engagement"];
  granularity: TimelineGranularity | null;
}) {
  const distribution = data.rating_distribution.map((row) => ({
    label: `${row.rating}★`,
    value: row.count,
  }));
  const timeline = data.reviews_timeline.map((point) => ({
    label: formatBucket(point.date, granularity),
    Reseñas: point.value,
  }));
  const maxReviews = Math.max(...data.top_reviewed_titles.map((row) => row.review_count), 1);

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Distribución de calificaciones" hint="Reseñas por nota">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distribution} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis allowDecimals={false} {...axisProps} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#ffffff10" }} />
              <Bar dataKey="value" name="Reseñas" radius={[6, 6, 0, 0]} fill={CHART_COLORS.series[2]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title={granularity === "month" ? "Reseñas por mes" : "Reseñas por día"}
          hint={
            granularity === "month"
              ? "Histórico completo agrupado por mes"
              : "Actividad del periodo seleccionado"
          }
        >
          {timeline.length === 0 ? (
            <EmptyChart message="Todavía no hay reseñas registradas" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" {...axisProps} minTickGap={18} />
                <YAxis allowDecimals={false} {...axisProps} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="Reseñas"
                  stroke={CHART_COLORS.series[4]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg bg-surface p-5">
          <h3 className="text-[15px] font-semibold">Títulos más reseñados</h3>
          {data.top_reviewed_titles.length === 0 ? (
            <p className={`${metaClass} mt-3`}>Sin reseñas todavía</p>
          ) : (
            <ul className="mt-3">
              {data.top_reviewed_titles.slice(0, 8).map((row) => (
                <li className="mb-2" key={row.id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate">{row.title}</span>
                    <span className={`${metaClass} shrink-0`}>{row.review_count}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-alt">
                    <div
                      className="h-full rounded-full bg-accent-text"
                      style={{ width: `${Math.max(8, (row.review_count / maxReviews) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg bg-surface p-5">
          <h3 className="text-[15px] font-semibold">Usuarios más activos</h3>
          {data.top_reviewers.length === 0 ? (
            <p className={`${metaClass} mt-3`}>Sin actividad todavía</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-lg border border-divider">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-divider bg-bg/80">
                    <th className="px-3 py-2 text-left">Usuario</th>
                    <th className="px-3 py-2 text-right">Reseñas</th>
                    <th className="px-3 py-2 text-right">Respuestas</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_reviewers.slice(0, 8).map((row) => (
                    <tr className="border-b border-divider/50" key={row.id}>
                      <td className="px-3 py-2 font-mono">@{row.username}</td>
                      <td className="px-3 py-2 text-right">{row.reviews}</td>
                      <td className="px-3 py-2 text-right">{row.replies}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function RangeNote({
  days,
  granularity,
}: {
  days: number | null;
  granularity: TimelineGranularity | null;
}) {
  return (
    <span className={metaClass}>
      {days == null
        ? "Todo el historial"
        : `Últimos ${days} días`}
      {days == null && granularity === "month" && " · agrupado por mes"}
    </span>
  );
}