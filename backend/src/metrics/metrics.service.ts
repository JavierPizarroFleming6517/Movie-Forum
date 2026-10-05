import { Injectable } from "@nestjs/common";
import { ActionType, ReportStatus, ReportType, TargetType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type MetricsRange = {
  days?: number;
};

export type DailyPoint = {
  date: string;
  value: number;
};

/**
 * When no explicit range is requested the timeline covers the whole history.
 * Long histories are bucketed by month so the series stays readable and the
 * payload small.
 */
export type TimelineGranularity = "day" | "month";

export const MAX_DAILY_POINTS = 120;

/** Below this the all-time chart collapses into a single dot and reads as empty. */
export const MIN_TIMELINE_POINTS = 7;

export type ModerationMetrics = {
  pending_reports: number;
  resolved_reports: number;
  dismissed_reports: number;
  actioned_reports: number;
  resolution_rate: number | null;
  avg_resolution_hours: number | null;
  active_bans: number;
  reports_by_type: Array<{ type: ReportType; count: number }>;
  reports_by_status: Array<{ status: ReportStatus; count: number }>;
  actions_by_type: Array<{ type: ActionType; count: number }>;
  reports_timeline: DailyPoint[];
  top_reported_titles: Array<{ id: number; title: string; report_count: number }>;
};

export type EngagementMetrics = {
  reviews: number;
  replies: number;
  active_users: number;
  global_average_rating: number | null;
  rating_distribution: Array<{ rating: number; count: number }>;
  reviews_timeline: DailyPoint[];
  top_reviewed_titles: Array<{ id: number; title: string; review_count: number }>;
  top_reviewers: Array<{ id: number; username: string; reviews: number; replies: number }>;
};

export type MetricsResponse = {
  users: number;
  titles: number;
  reviews: number;
  global_average_rating: number | null;
  top_titles: Array<{
    id: number;
    title: string;
    kind: "movie";
    average_rating: number;
    review_count: number;
  }>;
  range_days: number | null;
  timeline_granularity: TimelineGranularity | null;
  generated_at: string;
  moderation: ModerationMetrics;
  engagement: EngagementMetrics;
};

const REPORT_TYPES: ReportType[] = ["spam", "offensive", "spoiler", "other"];
const REPORT_STATUSES: ReportStatus[] = ["pending", "dismissed", "action_taken"];
const ACTION_TYPES: ActionType[] = ["warn", "delete_content", "ban_temp", "ban_perm"];

type CountRow = { _count: { id: number } };

function round(value: number | null | undefined, digits = 2): number | null {
  if (value == null || Number.isNaN(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

/** Whole days between two dates, ignoring the time of day. */
function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((b - a) / 86_400_000);
}

function startOfUtcDay(date: Date): Date {
  const day = new Date(date);
  day.setUTCHours(0, 0, 0, 0);
  return day;
}

/**
 * Turns a sparse per-day aggregation into a continuous series so charts do not
 * skip days without activity.
 */
function fillDailyTimeline(
  rows: Array<{ createdAt: Date } & CountRow>,
  days: number,
  now: Date,
): DailyPoint[] {
  // groupBy buckets on the exact timestamp, so a single day can arrive as many
  // rows. They have to be summed instead of overwritten.
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = dayKey(row.createdAt);
    counts.set(key, (counts.get(key) ?? 0) + row._count.id);
  }
  const points: DailyPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(now);
    day.setUTCHours(0, 0, 0, 0);
    day.setUTCDate(day.getUTCDate() - offset);
    points.push({ date: dayKey(day), value: counts.get(dayKey(day)) ?? 0 });
  }
  return points;
}

/** Same idea as {@link fillDailyTimeline} but bucketed by calendar month. */
function fillMonthlyTimeline(rows: Array<{ createdAt: Date } & CountRow>, now: Date): DailyPoint[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = monthKey(row.createdAt);
    counts.set(key, (counts.get(key) ?? 0) + row._count.id);
  }

  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const first = rows.reduce<Date | null>(
    (earliest, row) => (!earliest || row.createdAt < earliest ? row.createdAt : earliest),
    null,
  );
  if (!first) return [];
  // Widen the window to MIN_TIMELINE_POINTS only when the history is shorter,
  // never past the oldest record: clamping instead of extending would silently
  // drop real data from the chart.
  const earliestMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1));
  const floorMonth = new Date(cursor);
  floorMonth.setUTCMonth(floorMonth.getUTCMonth() - (MIN_TIMELINE_POINTS - 1));
  const start = earliestMonth < floorMonth ? earliestMonth : floorMonth;

  const points: DailyPoint[] = [];
  while (cursor >= start) {
    const key = monthKey(cursor);
    points.push({ date: key, value: counts.get(key) ?? 0 });
    cursor.setUTCMonth(cursor.getUTCMonth() - 1);
  }
  return points.reverse();
}

/**
 * Picks the bucket size for the requested window. An explicit short range stays
 * daily; the full history switches to months once it would exceed the daily cap.
 */
function resolveTimeline(
  rows: Array<{ createdAt: Date } & CountRow>,
  scopedDays: number,
  now: Date,
): { points: DailyPoint[]; granularity: TimelineGranularity | null } {
  if (scopedDays > 0) {
    return { points: fillDailyTimeline(rows, scopedDays, now), granularity: "day" };
  }
  const earliest = rows.reduce<Date | null>(
    (min, row) => (!min || row.createdAt < min ? row.createdAt : min),
    null,
  );
  if (!earliest) return { points: [], granularity: null };
  const span = daysBetween(startOfUtcDay(earliest), startOfUtcDay(now)) + 1;
  if (span <= MAX_DAILY_POINTS) {
    const days = Math.max(span, MIN_TIMELINE_POINTS);
    return { points: fillDailyTimeline(rows, days, now), granularity: "day" };
  }
  return { points: fillMonthlyTimeline(rows, now), granularity: "month" };
}

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(params: MetricsRange = {}): Promise<MetricsResponse> {
    const { days } = params;
    const scoped = typeof days === "number" && Number.isFinite(days) && days > 0;
    const span = scoped ? Math.floor(days as number) : 0;
    const now = new Date();
    const from = new Date(now);
    from.setUTCHours(0, 0, 0, 0);
    from.setUTCDate(from.getUTCDate() - (span - 1));
    const created = scoped ? { gte: from } : undefined;

    const [
      users,
      titles,
      reviews,
      replies,
      avgRating,
      topRated,
      pendingReports,
      resolvedReports,
      dismissedReports,
      actionedReports,
      activeBans,
      reportsByType,
      reportsByStatus,
      actionsByType,
      ratingRows,
      topReviewed,
      reviewerRows,
      reportRows,
      reviewRows,
      replyRows,
      topReported,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.pelicula.count(),
      this.prisma.review.count(),
      this.prisma.reviewReply.count(),
      this.prisma.review.aggregate({ _avg: { rating: true } }),
      this.prisma.review.groupBy({
        by: ["peliculaId"],
        _avg: { rating: true },
        _count: { id: true },
        orderBy: { _avg: { rating: "desc" } },
        take: 10,
      }),
      this.prisma.report.count({ where: { status: ReportStatus.pending } }),
      this.prisma.report.count({
        where: {
          status: { not: ReportStatus.pending },
          ...(created ? { resolvedAt: created } : {}),
        },
      }),
      this.prisma.report.count({
        where: { status: ReportStatus.dismissed, ...(created ? { resolvedAt: created } : {}) },
      }),
      this.prisma.report.count({
        where: { status: ReportStatus.action_taken, ...(created ? { resolvedAt: created } : {}) },
      }),
      this.prisma.moderationAction.count({
        where: {
          type: { in: [ActionType.ban_temp, ActionType.ban_perm] },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      this.prisma.report.groupBy({
        by: ["type"],
        _count: { id: true },
        ...(created ? { where: { createdAt: created } } : {}),
      }),
      this.prisma.report.groupBy({
        by: ["status"],
        _count: { id: true },
        ...(created ? { where: { createdAt: created } } : {}),
      }),
      this.prisma.moderationAction.groupBy({
        by: ["type"],
        _count: { id: true },
        ...(created ? { where: { createdAt: created } } : {}),
      }),
      this.prisma.review.groupBy({ by: ["rating"], _count: { id: true } }),
      this.prisma.review.groupBy({
        by: ["peliculaId"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      this.prisma.review.groupBy({
        by: ["userId"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      // The timelines always load so the "all time" view has a series to draw;
      // resolveTimeline decides the bucket size.
      this.prisma.report.groupBy({
        by: ["createdAt"],
        _count: { id: true },
        ...(created ? { where: { createdAt: created } } : {}),
      }),
      this.prisma.review.groupBy({
        by: ["createdAt"],
        _count: { id: true },
        ...(created ? { where: { createdAt: created } } : {}),
      }),
      this.prisma.reviewReply.groupBy({
        by: ["createdAt"],
        _count: { id: true },
        ...(created ? { where: { createdAt: created } } : {}),
      }),
      // Top reported titles only make sense for a bounded window; over the whole
      // history the leaderboard would barely change.
      scoped
        ? this.prisma.report.groupBy({
            by: ["targetId"],
            _count: { id: true },
            where: { targetType: TargetType.review, createdAt: created },
            orderBy: { _count: { id: "desc" } },
            take: 10,
          })
        : Promise.resolve([] as Array<{ targetId: number } & CountRow>),
    ]);

    const reviewerIds = reviewerRows.map((row) => row.userId);
    const topReportedMovies = await this.topReportedMovies(topReported);
    const [movies, reviewers, repliesByReviewer, avgResolutionHours] = await Promise.all([
      this.titlesFor([
        ...topRated.map((row) => row.peliculaId),
        ...topReviewed.map((row) => row.peliculaId),
        ...topReportedMovies.map((row) => row.id),
      ]),
      reviewerIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: reviewerIds } },
            select: { id: true, username: true },
          })
        : Promise.resolve([]),
      reviewerIds.length
        ? this.prisma.reviewReply.groupBy({
            by: ["userId"],
            _count: { id: true },
            where: { userId: { in: reviewerIds } },
          })
        : Promise.resolve([] as Array<{ userId: number } & CountRow>),
      this.averageResolutionHours(created),
    ]);

    const titleById = new Map(movies.map((item) => [item.id, item.titulo || "Sin título"]));
    const usernameById = new Map(reviewers.map((item) => [item.id, item.username]));
    const repliesByUser = new Map(repliesByReviewer.map((row) => [row.userId, row._count.id]));
    const globalAverage = round(avgRating._avg.rating);

    const reportsTimeline = resolveTimeline(reportRows, span, now);
    const reviewsTimeline = resolveTimeline(reviewRows, span, now);
    // Report the coarsest bucket in use so the axis label matches both charts.
    const timelineGranularity: TimelineGranularity | null =
      reportsTimeline.granularity === "month" || reviewsTimeline.granularity === "month"
        ? "month"
        : reportsTimeline.granularity ?? reviewsTimeline.granularity;

    const handled = dismissedReports + actionedReports;
    const engagement: EngagementMetrics = {
      reviews,
      replies,
      active_users: await this.prisma.user.count({ where: { isActive: true } }),
      global_average_rating: globalAverage,
      rating_distribution: [1, 2, 3, 4, 5].map((rating) => ({
        rating,
        count: ratingRows.find((row) => row.rating === rating)?._count.id ?? 0,
      })),
      reviews_timeline: reviewsTimeline.points,
      top_reviewed_titles: topReviewed.map((row) => ({
        id: row.peliculaId,
        title: titleById.get(row.peliculaId) || "Sin título",
        review_count: row._count.id,
      })),
      top_reviewers: reviewerRows.map((row) => ({
        id: row.userId,
        username: usernameById.get(row.userId) || "Usuario",
        reviews: row._count.id,
        replies: repliesByUser.get(row.userId) ?? 0,
      })),
    };

    return {
      users,
      titles,
      reviews,
      global_average_rating: globalAverage,
      top_titles: topRated.map((row) => ({
        id: row.peliculaId,
        title: titleById.get(row.peliculaId) || "Sin título",
        kind: "movie" as const,
        average_rating: round(row._avg.rating) ?? 0,
        review_count: row._count.id,
      })),
      range_days: scoped ? span : null,
      timeline_granularity: timelineGranularity,
      generated_at: now.toISOString(),
      moderation: {
        pending_reports: pendingReports,
        resolved_reports: resolvedReports,
        dismissed_reports: dismissedReports,
        actioned_reports: actionedReports,
        resolution_rate: handled ? round((handled / (handled + pendingReports)) * 100) : null,
        avg_resolution_hours: avgResolutionHours,
        active_bans: activeBans,
        reports_by_type: REPORT_TYPES.map((type) => ({
          type,
          count: reportsByType.find((row) => row.type === type)?._count.id ?? 0,
        })),
        reports_by_status: REPORT_STATUSES.map((status) => ({
          status,
          count: reportsByStatus.find((row) => row.status === status)?._count.id ?? 0,
        })),
        actions_by_type: ACTION_TYPES.map((type) => ({
          type,
          count: actionsByType.find((row) => row.type === type)?._count.id ?? 0,
        })),
        reports_timeline: reportsTimeline.points,
        top_reported_titles: topReportedMovies.map((row) => ({
          id: row.id,
          title: titleById.get(row.id) || "Sin título",
          report_count: row.report_count,
        })),
      },
      engagement,
    };
  }

  private async titlesFor(ids: number[]): Promise<Array<{ id: number; titulo: string }>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return [];
    return this.prisma.pelicula.findMany({
      where: { id: { in: unique } },
      select: { id: true, titulo: true },
    });
  }

  /**
   * Reports on reviews reference a review id, not a movie id, so the movie has
   * to be resolved before counting. Grouping happens in memory because Prisma
   * cannot group by a relation field.
   */
  private async topReportedMovies(
    rows: Array<{ targetId: number } & CountRow>,
  ): Promise<Array<{ id: number; report_count: number }>> {
    const reviewIds = [...new Set(rows.map((row) => row.targetId))];
    if (reviewIds.length === 0) return [];
    const reviews = await this.prisma.review.findMany({
      where: { id: { in: reviewIds } },
      select: { id: true, peliculaId: true },
    });
    const movieByReview = new Map(reviews.map((review) => [review.id, review.peliculaId]));
    const counts = new Map<number, number>();
    for (const row of rows) {
      const movieId = movieByReview.get(row.targetId);
      if (movieId == null) continue;
      counts.set(movieId, (counts.get(movieId) ?? 0) + row._count.id);
    }
    return [...counts.entries()]
      .map(([id, report_count]) => ({ id, report_count }))
      .sort((a, b) => b.report_count - a.report_count)
      .slice(0, 10);
  }

  /**
   * Mean hours between creation and resolution. Pending reports are excluded
   * because they have no resolution timestamp yet.
   */
  private async averageResolutionHours(
    window?: { gte: Date },
  ): Promise<number | null> {
    const resolved = await this.prisma.report.findMany({
      where: { resolvedAt: { not: null }, ...(window ? { resolvedAt: window } : {}) },
      select: { createdAt: true, resolvedAt: true },
    });
    if (resolved.length === 0) return null;
    const totalHours = resolved.reduce((sum, row) => {
      if (!row.resolvedAt) return sum;
      return sum + (row.resolvedAt.getTime() - row.createdAt.getTime()) / 3_600_000;
    }, 0);
    return round(totalHours / resolved.length);
  }
}