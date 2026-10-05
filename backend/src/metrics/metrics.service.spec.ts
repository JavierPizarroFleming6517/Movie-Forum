import { ActionType, ReportStatus, ReportType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { MetricsService, MIN_TIMELINE_POINTS } from "./metrics.service";

type Row = { _count: { id: number } };

function createPrisma(overrides: Record<string, unknown> = {}) {
  const groupByDefaults = {
    report: {
      by_type: [] as Array<{ type: ReportType } & Row>,
      by_status: [] as Array<{ status: ReportStatus } & Row>,
      by_target: [] as Array<{ targetId: number } & Row>,
      by_created: [] as Array<{ createdAt: Date } & Row>,
    },
    moderationAction: {
      by_type: [] as Array<{ type: ActionType } & Row>,
    },
    review: {
      by_rating: [] as Array<{ rating: number } & Row>,
      top_rated: [] as Array<{ peliculaId: number; _avg: { rating: number | null } } & Row>,
      top_reviewed: [] as Array<{ peliculaId: number } & Row>,
      by_user: [] as Array<{ userId: number } & Row>,
      by_created: [] as Array<{ createdAt: Date } & Row>,
    },
    reviewReply: {
      by_created: [] as Array<{ createdAt: Date } & Row>,
      by_user: [] as Array<{ userId: number } & Row>,
    },
  };

  const prisma = {
    user: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    pelicula: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    review: {
      count: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockResolvedValue({ _avg: { rating: null } }),
      // findMany resolves reported review ids into their movie.
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockImplementation(
        ({ by, _avg }: { by: string[]; _avg?: unknown }) => {
          const key = by.join(",");
          const map: Record<string, unknown> = {
            // Both group-by calls key on peliculaId; the rating one asks for _avg.
            peliculaId: _avg ? groupByDefaults.review.top_rated : groupByDefaults.review.top_reviewed,
            rating: groupByDefaults.review.by_rating,
            userId: groupByDefaults.review.by_user,
            createdAt: groupByDefaults.review.by_created,
          };
          return Promise.resolve(map[key] ?? []);
        },
      ),
    },
    reviewReply: {
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockImplementation(({ by }: { by: string[] }) => {
        const key = by.join(",");
        const map: Record<string, unknown> = {
          createdAt: groupByDefaults.reviewReply.by_created,
          userId: groupByDefaults.reviewReply.by_user,
        };
        return Promise.resolve(map[key] ?? []);
      }),
    },
    report: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockImplementation(({ by }: { by: string[] }) => {
        const key = by.join(",");
        const map: Record<string, unknown> = {
          type: groupByDefaults.report.by_type,
          status: groupByDefaults.report.by_status,
          targetId: groupByDefaults.report.by_target,
          createdAt: groupByDefaults.report.by_created,
        };
        return Promise.resolve(map[key] ?? []);
      }),
    },
    moderationAction: {
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockImplementation(() =>
        Promise.resolve(groupByDefaults.moderationAction.by_type),
      ),
    },
    ...overrides,
  };

  return { prisma: prisma as unknown as PrismaService, groupByDefaults };
}

describe("MetricsService", () => {
  it("returns the legacy shape when no range is requested", async () => {
    const { prisma, groupByDefaults } = createPrisma();
    (prisma.user.count as jest.Mock).mockResolvedValue(3);
    (prisma.pelicula.count as jest.Mock).mockResolvedValue(2);
    (prisma.review.count as jest.Mock).mockResolvedValue(4);
    (prisma.review.aggregate as jest.Mock).mockResolvedValue({ _avg: { rating: 8.25 } });
    groupByDefaults.review.top_rated = [
      { peliculaId: 111, _avg: { rating: 9.1 }, _count: { id: 2 } },
      { peliculaId: 999, _avg: { rating: null }, _count: { id: 1 } },
    ];
    (prisma.pelicula.findMany as jest.Mock).mockResolvedValue([{ id: 111, titulo: "Dune" }]);

    const result = await new MetricsService(prisma).getMetrics();

    expect(result.users).toBe(3);
    expect(result.titles).toBe(2);
    expect(result.reviews).toBe(4);
    expect(result.global_average_rating).toBe(8.25);
    expect(result.top_titles[0]).toMatchObject({
      id: 111,
      title: "Dune",
      kind: "movie",
      average_rating: 9.1,
      review_count: 2,
    });
    expect(result.top_titles[1].title).toBe("Sin título");
    expect(result.top_titles[1].average_rating).toBe(0);
    expect(result.range_days).toBeNull();
  });

  it("returns null averages and empty series when the forum is empty", async () => {
    const { prisma } = createPrisma();
    const result = await new MetricsService(prisma).getMetrics();

    expect(result).toMatchObject({
      users: 0,
      titles: 0,
      reviews: 0,
      global_average_rating: null,
      top_titles: [],
      range_days: null,
    });
    expect(result.moderation.resolution_rate).toBeNull();
    expect(result.moderation.avg_resolution_hours).toBeNull();
    // No activity at all means there is nothing to plot and no bucket to pick.
    expect(result.moderation.reports_timeline).toEqual([]);
    expect(result.engagement.reviews_timeline).toEqual([]);
    expect(result.timeline_granularity).toBeNull();
  });

  it("pads a single-day history so the all-time line is still readable", async () => {
    const { prisma, groupByDefaults } = createPrisma();
    const now = new Date();
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);
    groupByDefaults.report.by_created = [{ createdAt: today, _count: { id: 4 } }];
    groupByDefaults.review.by_created = [{ createdAt: today, _count: { id: 9 } }];

    const result = await new MetricsService(prisma).getMetrics();

    // Without padding this renders as one dot with no axis labels.
    expect(result.timeline_granularity).toBe("day");
    expect(result.moderation.reports_timeline).toHaveLength(MIN_TIMELINE_POINTS);
    expect(result.moderation.reports_timeline.at(-1)).toEqual({
      date: today.toISOString().slice(0, 10),
      value: 4,
    });
    expect(result.engagement.reviews_timeline.at(-1)?.value).toBe(9);
    expect(result.engagement.reviews_timeline[0].value).toBe(0);
  });

  it("never truncates history when padding kicks in", async () => {
    const { prisma, groupByDefaults } = createPrisma();
    const now = new Date();
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);
    // Oldest record sits outside the 7-day padding floor.
    const old = new Date(today);
    old.setUTCDate(old.getUTCDate() - 40);
    groupByDefaults.report.by_created = [{ createdAt: old, _count: { id: 7 } }];

    const result = await new MetricsService(prisma).getMetrics();

    // 41 days of history must survive; the floor must not cut the oldest bucket.
    expect(result.moderation.reports_timeline).toHaveLength(41);
    expect(result.moderation.reports_timeline[0]).toEqual({
      date: old.toISOString().slice(0, 10),
      value: 7,
    });
    expect(result.engagement.rating_distribution).toEqual([
      { rating: 1, count: 0 },
      { rating: 2, count: 0 },
      { rating: 3, count: 0 },
      { rating: 4, count: 0 },
      { rating: 5, count: 0 },
    ]);
    expect(result.engagement.top_reviewers).toEqual([]);
  });

  it("builds a continuous daily series and filters the window", async () => {
    const { prisma, groupByDefaults } = createPrisma();
    const now = new Date();
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    groupByDefaults.report.by_created = [
      { createdAt: today, _count: { id: 3 } },
      { createdAt: yesterday, _count: { id: 1 } },
    ];
    groupByDefaults.review.by_created = [{ createdAt: today, _count: { id: 4 } }];

    const result = await new MetricsService(prisma).getMetrics({ days: 3 });

    expect(result.range_days).toBe(3);
    expect(result.moderation.reports_timeline).toHaveLength(3);
    expect(result.moderation.reports_timeline[2]).toEqual({
      date: today.toISOString().slice(0, 10),
      value: 3,
    });
    // The middle day has no rows, so it must be zero-filled instead of skipped.
    expect(result.moderation.reports_timeline[1].value).toBe(1);
    expect(result.moderation.reports_timeline[0].value).toBe(0);
    expect(result.engagement.reviews_timeline).toHaveLength(3);
    expect(result.engagement.reviews_timeline[2].value).toBe(4);
    expect(result.engagement.reviews_timeline[0].value).toBe(0);

    const reportGroupBy = (prisma.report.groupBy as jest.Mock).mock.calls[0][0];
    expect(reportGroupBy.where).toEqual({ createdAt: { gte: expect.any(Date) } });
    expect(result.timeline_granularity).toBe("day");
  });

  it("sums several timestamps that fall on the same day", async () => {
    const { prisma, groupByDefaults } = createPrisma();
    const now = new Date();
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);
    // groupBy buckets on the exact timestamp, so one day yields several rows.
    const morning = new Date(today);
    morning.setUTCHours(9, 30, 0, 0);
    const evening = new Date(today);
    evening.setUTCHours(21, 15, 0, 0);
    groupByDefaults.report.by_created = [
      { createdAt: morning, _count: { id: 2 } },
      { createdAt: evening, _count: { id: 5 } },
    ];

    const result = await new MetricsService(prisma).getMetrics({ days: 7 });

    // 2 + 5, not just the last row for the day.
    expect(result.moderation.reports_timeline.at(-1)).toEqual({
      date: today.toISOString().slice(0, 10),
      value: 7,
    });
  });

  it("plots the whole history by day when it fits under the daily cap", async () => {
    const { prisma, groupByDefaults } = createPrisma();
    const now = new Date();
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);
    const tenDaysAgo = new Date(today);
    tenDaysAgo.setUTCDate(tenDaysAgo.getUTCDate() - 10);
    groupByDefaults.report.by_created = [{ createdAt: tenDaysAgo, _count: { id: 2 } }];
    groupByDefaults.review.by_created = [{ createdAt: today, _count: { id: 6 } }];

    const result = await new MetricsService(prisma).getMetrics();

    expect(result.range_days).toBeNull();
    expect(result.timeline_granularity).toBe("day");
    // Spans the 11 days between the oldest row and today, not a fixed window.
    expect(result.moderation.reports_timeline).toHaveLength(11);
    expect(result.moderation.reports_timeline[0]).toEqual({
      date: tenDaysAgo.toISOString().slice(0, 10),
      value: 2,
    });
    expect(result.moderation.reports_timeline[10].value).toBe(0);
    // Reviews only exist today, but the window is padded so the line is readable.
    expect(result.engagement.reviews_timeline).toHaveLength(7);
    expect(result.engagement.reviews_timeline.at(-1)).toEqual({
      date: today.toISOString().slice(0, 10),
      value: 6,
    });
    expect(result.engagement.reviews_timeline[0].value).toBe(0);
    // Unbounded history cannot rank individual titles meaningfully.
    expect(result.moderation.top_reported_titles).toEqual([]);
    const reportGroupBy = (prisma.report.groupBy as jest.Mock).mock.calls[0][0];
    expect(reportGroupBy.where).toBeUndefined();
  });

  it("switches the all-time view to months on long histories", async () => {
    const { prisma, groupByDefaults } = createPrisma();
    const now = new Date();
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);
    // Ten months back, beyond the 120-day daily cap.
    const tenMonthsAgo = new Date(today);
    tenMonthsAgo.setUTCMonth(tenMonthsAgo.getUTCMonth() - 10);
    groupByDefaults.report.by_created = [
      { createdAt: tenMonthsAgo, _count: { id: 3 } },
      { createdAt: today, _count: { id: 5 } },
    ];

    const result = await new MetricsService(prisma).getMetrics();

    expect(result.timeline_granularity).toBe("month");
    const timeline = result.moderation.reports_timeline;
    // One bucket per month from the oldest data up to the current month.
    expect(timeline).toHaveLength(11);
    expect(timeline[0].date).toBe(today.toISOString().slice(0, 7).replace(/^(\d{4})-(\d{2})$/, (_m, y, mo) => {
      const d = new Date(today);
      d.setUTCMonth(d.getUTCMonth() - 10);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    }));
    expect(timeline[0].value).toBe(3);
    expect(timeline[10].value).toBe(5);
    expect(timeline[5].value).toBe(0);
    // Month buckets use YYYY-MM, never a full ISO day.
    expect(timeline[0].date).toMatch(/^\d{4}-\d{2}$/);
  });

  it("reports month granularity when only one of the two series needs it", async () => {
    const { prisma, groupByDefaults } = createPrisma();
    const now = new Date();
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);
    const tenMonthsAgo = new Date(today);
    tenMonthsAgo.setUTCMonth(tenMonthsAgo.getUTCMonth() - 10);
    // Reviews are recent enough to stay daily, reports are not.
    groupByDefaults.report.by_created = [{ createdAt: tenMonthsAgo, _count: { id: 1 } }];
    groupByDefaults.review.by_created = [{ createdAt: today, _count: { id: 2 } }];

    const result = await new MetricsService(prisma).getMetrics();

    expect(result.moderation.reports_timeline[0].date).toMatch(/^\d{4}-\d{2}$/);
    expect(result.engagement.reviews_timeline[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.timeline_granularity).toBe("month");
  });

  it("counts moderation breakdowns across every enum value", async () => {
    const { prisma, groupByDefaults } = createPrisma();
    groupByDefaults.report.by_type = [{ type: ReportType.spam, _count: { id: 4 } }];
    groupByDefaults.report.by_status = [{ status: ReportStatus.pending, _count: { id: 4 } }];
    groupByDefaults.moderationAction.by_type = [
      { type: ActionType.ban_temp, _count: { id: 2 } },
    ];
    (prisma.report.count as jest.Mock).mockImplementation(({ where }: { where?: { status?: unknown } }) => {
      const status = where?.status;
      if (status === ReportStatus.pending) return Promise.resolve(4);
      if (status === ReportStatus.dismissed) return Promise.resolve(2);
      if (status === ReportStatus.action_taken) return Promise.resolve(1);
      // Resolved total query filters with `not: pending`.
      return Promise.resolve(3);
    });
    (prisma.moderationAction.count as jest.Mock).mockResolvedValue(2);

    const result = await new MetricsService(prisma).getMetrics();

    expect(result.moderation.pending_reports).toBe(4);
    expect(result.moderation.resolved_reports).toBe(3);
    expect(result.moderation.dismissed_reports).toBe(2);
    expect(result.moderation.actioned_reports).toBe(1);
    expect(result.moderation.active_bans).toBe(2);
    expect(result.moderation.reports_by_type).toEqual([
      { type: ReportType.spam, count: 4 },
      { type: ReportType.offensive, count: 0 },
      { type: ReportType.spoiler, count: 0 },
      { type: ReportType.other, count: 0 },
    ]);
    expect(result.moderation.actions_by_type).toEqual([
      { type: ActionType.warn, count: 0 },
      { type: ActionType.delete_content, count: 0 },
      { type: ActionType.ban_temp, count: 2 },
      { type: ActionType.ban_perm, count: 0 },
    ]);
    expect(result.moderation.resolution_rate).toBe(42.86);
  });

  it("averages resolution time and joins reviewer names", async () => {
    const { prisma, groupByDefaults } = createPrisma();
    const created = new Date("2026-01-01T00:00:00.000Z");
    (prisma.report.findMany as jest.Mock).mockResolvedValue([
      { createdAt: created, resolvedAt: new Date("2026-01-01T02:00:00.000Z") },
      { createdAt: created, resolvedAt: new Date("2026-01-01T06:00:00.000Z") },
    ]);
    groupByDefaults.review.by_user = [{ userId: 7, _count: { id: 5 } }];
    groupByDefaults.reviewReply.by_user = [{ userId: 7, _count: { id: 3 } }];
    (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 7, username: "luna" }]);
    (prisma.reviewReply.count as jest.Mock).mockResolvedValue(11);
    (prisma.review.count as jest.Mock).mockResolvedValue(1);

    const result = await new MetricsService(prisma).getMetrics();

    expect(result.moderation.avg_resolution_hours).toBe(4);
    expect(result.engagement.top_reviewers).toEqual([
      { id: 7, username: "luna", reviews: 5, replies: 3 },
    ]);
    expect(result.engagement.replies).toBe(11);
    expect(result.engagement.reviews).toBe(1);
  });

  it("falls back to placeholder labels when titles or users are missing", async () => {
    const { prisma, groupByDefaults } = createPrisma();
    groupByDefaults.review.top_reviewed = [{ peliculaId: 404, _count: { id: 2 } }];
    groupByDefaults.review.by_user = [{ userId: 99, _count: { id: 1 } }];
    (prisma.pelicula.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

    const result = await new MetricsService(prisma).getMetrics({ days: 7 });

    expect(result.engagement.top_reviewed_titles[0].title).toBe("Sin título");
    expect(result.engagement.top_reviewers[0].username).toBe("Usuario");
  });

  it("maps reported review ids to their movie instead of using them as ids", async () => {
    const { prisma, groupByDefaults } = createPrisma();
    groupByDefaults.report.by_target = [
      { targetId: 10, _count: { id: 1 } },
      { targetId: 12, _count: { id: 2 } },
      { targetId: 11, _count: { id: 1 } },
    ];
    // Review 10 belongs to movie 500; reviews 11 and 12 both to movie 600.
    (prisma.review.findMany as jest.Mock).mockResolvedValue([
      { id: 10, peliculaId: 500 },
      { id: 11, peliculaId: 600 },
      { id: 12, peliculaId: 600 },
    ]);
    (prisma.pelicula.findMany as jest.Mock).mockResolvedValue([
      { id: 500, titulo: "Alien" },
      { id: 600, titulo: "Blade Runner" },
    ]);

    const result = await new MetricsService(prisma).getMetrics({ days: 30 });

    // Review ids must never leak into the response, and counts merge per movie
    // so the two reports on reviews 11 and 12 add up under movie 600.
    expect(result.moderation.top_reported_titles).toEqual([
      { id: 600, title: "Blade Runner", report_count: 3 },
      { id: 500, title: "Alien", report_count: 1 },
    ]);
    expect(prisma.pelicula.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: expect.arrayContaining([500, 600]) } } }),
    );
  });

  it("ignores reported reviews that no longer exist", async () => {
    const { prisma, groupByDefaults } = createPrisma();
    groupByDefaults.report.by_target = [{ targetId: 777, _count: { id: 4 } }];
    (prisma.review.findMany as jest.Mock).mockResolvedValue([]);

    const result = await new MetricsService(prisma).getMetrics({ days: 30 });

    expect(result.moderation.top_reported_titles).toEqual([]);
  });
});