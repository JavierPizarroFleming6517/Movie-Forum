import type { ReactNode } from "react";

/**
 * Recharts only attaches hover/click handlers when the chart tree is rendered
 * inside a ResponsiveContainer, so every chart in this project must use this
 * wrapper. It also centralises the dark-theme colours so charts match the rest
 * of the UI instead of shipping recharts' light defaults.
 */
export const CHART_COLORS = {
  grid: "#454c58",
  axis: "#c5c9d0",
  tooltipBg: "#1a2332",
  tooltipBorder: "#6ba3d6",
  series: ["#6ba3d6", "#1e4b8a", "#c2703a", "#7d6bb5", "#4f9e7a", "#b5646e"],
} as const;

export const tooltipStyle = {
  backgroundColor: CHART_COLORS.tooltipBg,
  border: `1px solid ${CHART_COLORS.tooltipBorder}`,
  borderRadius: 8,
  color: "#fff",
  fontSize: 13,
} as const;

export const axisProps = {
  stroke: CHART_COLORS.axis,
  fontSize: 12,
  tickLine: false,
} as const;

export function ChartCard({
  title,
  hint,
  height = 240,
  children,
}: {
  title: string;
  hint?: string;
  height?: number;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg bg-surface p-5">
      <h3 className="text-[15px] font-semibold">{title}</h3>
      {hint && <p className="mt-0.5 text-[13px] text-muted">{hint}</p>}
      <div className="mt-4" style={{ width: "100%", height }}>
        {children}
      </div>
    </section>
  );
}

export function EmptyChart({ message = "Sin datos en este periodo" }: { message?: string }) {
  return (
    <div className="flex h-full items-center justify-center text-[13px] text-muted">{message}</div>
  );
}