import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { ActionType, ReportStatus, TargetType, User } from "@prisma/client";
import { ReportsService } from "./reports.service";
import { PrismaService } from "../prisma/prisma.service";

const moderator = {
  id: 1,
  email: "admin@foropelis.test",
  username: "admin",
  hashedPassword: "x",
  isActive: true,
  role: "admin",
  createdAt: new Date(),
} as User;

const author = {
  id: 7,
  email: "ana@foro.test",
  username: "ana",
  hashedPassword: "x",
  isActive: true,
  role: "user",
  createdAt: new Date(),
} as User;

describe("ReportsService", () => {
  let prisma: any;
  let service: ReportsService;

  beforeEach(() => {
    prisma = {
      report: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      review: { findUnique: jest.fn(), delete: jest.fn() },
      reviewReply: { findUnique: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
      user: { findUnique: jest.fn(), update: jest.fn() },
      moderationAction: { create: jest.fn(), findFirst: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((cb: any) => cb(prisma));
    prisma.report.count.mockResolvedValue(0);
    prisma.report.findMany.mockResolvedValue([]);
    prisma.reviewReply.findMany.mockResolvedValue([]);
    prisma.report.updateMany.mockResolvedValue({ count: 1 });
    prisma.moderationAction.create.mockResolvedValue({
      id: 50,
      type: ActionType.warn,
      targetId: 1,
      targetType: TargetType.review,
      moderatorId: moderator.id,
      durationDays: null,
      expiresAt: null,
    });
    service = new ReportsService(prisma as unknown as PrismaService);
  });

  describe("createReport", () => {
    it("rejects a second pending report on the same content", async () => {
      prisma.report.findFirst.mockResolvedValue({ id: 1 });

      await expect(
        service.createReport(5, TargetType.review, author, "spam", "otra vez"),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.report.create).not.toHaveBeenCalled();
    });

    it("rejects reporting your own content", async () => {
      prisma.report.findFirst.mockResolvedValue(null);
      prisma.review.findUnique.mockResolvedValue({ id: 5, userId: author.id });

      await expect(
        service.createReport(5, TargetType.review, author, "spam", "x"),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("rejects content that does not exist", async () => {
      prisma.report.findFirst.mockResolvedValue(null);
      prisma.reviewReply.findUnique.mockResolvedValue(null);

      await expect(
        service.createReport(5, TargetType.reply, author, "spam", "x"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("creates the report for someone else's content", async () => {
      prisma.report.findFirst.mockResolvedValue(null);
      prisma.review.findUnique.mockResolvedValue({ id: 5, userId: 7 });
      prisma.report.create.mockResolvedValue({ id: 9 });

      await expect(
        service.createReport(5, TargetType.review, moderator, "offensive", "lenguaje"),
      ).resolves.toEqual({ id: 9 });

      expect(prisma.report.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ targetId: 5, targetType: TargetType.review }),
        }),
      );
    });
  });

  describe("getReports", () => {
    it("filters by status, type and search term", async () => {
      await service.getReports({
        status: ReportStatus.pending,
        type: "spam",
        search: "ana",
      });

      expect(prisma.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: "pending",
            type: "spam",
            OR: [
              { reason: { contains: "ana", mode: "insensitive" } },
              { reporter: { username: { contains: "ana", mode: "insensitive" } } },
            ],
          },
        }),
      );
    });

    it("paginates with the requested page and limit", async () => {
      await service.getReports({ page: 3, limit: 5 });

      expect(prisma.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
      expect(service).toBeTruthy();
    });

    it("ignores a blank search term", async () => {
      await service.getReports({ search: "   " });

      expect(prisma.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  describe("resolveReport", () => {
    it("throws when the report does not exist", async () => {
      prisma.report.findUnique.mockResolvedValue(null);

      await expect(
        service.resolveReport(1, moderator, ReportStatus.dismissed),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws when the report was already resolved", async () => {
      prisma.report.findUnique.mockResolvedValue({ id: 1, status: ReportStatus.dismissed });

      await expect(
        service.resolveReport(1, moderator, ReportStatus.dismissed),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("records who resolved the report", async () => {
      prisma.report.findUnique.mockResolvedValue({ id: 1, status: ReportStatus.pending });
      prisma.report.update.mockResolvedValue({ id: 1 });

      await service.resolveReport(1, moderator, ReportStatus.dismissed);

      expect(prisma.report.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "dismissed",
            resolvedById: moderator.id,
          }),
        }),
      );
    });
  });

  describe("createModerationAction", () => {
    it("requires durationDays for a temporary ban", async () => {
      await expect(
        service.createModerationAction(moderator, ActionType.ban_temp, 5, TargetType.review),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("throws when the content to moderate does not exist", async () => {
      prisma.review.findUnique.mockResolvedValue(null);

      await expect(
        service.createModerationAction(moderator, ActionType.warn, 5, TargetType.review),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("refuses content actions on a user target", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 7 });

      await expect(
        service.createModerationAction(moderator, ActionType.delete_content, 7, TargetType.user),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("refuses to ban your own account", async () => {
      prisma.review.findUnique.mockResolvedValue({ userId: moderator.id });

      await expect(
        service.createModerationAction(
          moderator,
          ActionType.ban_perm,
          5,
          TargetType.review,
          undefined,
          undefined,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects a reportId that points at other content", async () => {
      prisma.review.findUnique.mockResolvedValue({ userId: 7 });
      prisma.report.findUnique.mockResolvedValue({ id: 3, targetId: 999, targetType: TargetType.review });

      await expect(
        service.createModerationAction(
          moderator,
          ActionType.warn,
          5,
          TargetType.review,
          undefined,
          undefined,
          3,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("targets the content itself for a warning", async () => {
      prisma.review.findUnique.mockResolvedValue({ userId: 7 });

      await service.createModerationAction(moderator, ActionType.warn, 5, TargetType.review, "leve");

      expect(prisma.moderationAction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "warn",
            targetId: 5,
            targetType: TargetType.review,
            moderatorId: moderator.id,
            reason: "leve",
            durationDays: null,
            expiresAt: null,
          }),
        }),
      );
    });

    it("deletes the review when the action is delete_content", async () => {
      prisma.review.findUnique.mockResolvedValue({ userId: 7 });

      await service.createModerationAction(
        moderator,
        ActionType.delete_content,
        5,
        TargetType.review,
      );

      expect(prisma.review.delete).toHaveBeenCalledWith({ where: { id: 5 } });
      expect(prisma.reviewReply.delete).not.toHaveBeenCalled();
    });

    it("deletes the reply when the target is a reply", async () => {
      prisma.reviewReply.findUnique.mockResolvedValue({ userId: 7 });

      await service.createModerationAction(
        moderator,
        ActionType.delete_content,
        9,
        TargetType.reply,
      );

      expect(prisma.reviewReply.delete).toHaveBeenCalledWith({ where: { id: 9 } });
      expect(prisma.review.delete).not.toHaveBeenCalled();
    });

    it("applies a temporary ban to the author, not to the content id", async () => {
      prisma.review.findUnique.mockResolvedValue({ userId: 7 });

      await service.createModerationAction(
        moderator,
        ActionType.ban_temp,
        5,
        TargetType.review,
        "spam",
        7,
      );

      const { data } = prisma.moderationAction.create.mock.calls[0][0];
      expect(data.targetType).toBe(TargetType.user);
      expect(data.targetId).toBe(7);
      expect(data.durationDays).toBe(7);
      expect(data.expiresAt).toBeInstanceOf(Date);
      expect(data.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("applies a permanent ban without expiration", async () => {
      prisma.reviewReply.findUnique.mockResolvedValue({ userId: 7 });

      await service.createModerationAction(
        moderator,
        ActionType.ban_perm,
        9,
        TargetType.reply,
      );

      const { data } = prisma.moderationAction.create.mock.calls[0][0];
      expect(data.targetType).toBe(TargetType.user);
      expect(data.targetId).toBe(7);
      expect(data.expiresAt).toBeNull();
    });

    it("does not deactivate the account when banning", async () => {
      prisma.review.findUnique.mockResolvedValue({ userId: 7 });

      await service.createModerationAction(
        moderator,
        ActionType.ban_temp,
        5,
        TargetType.review,
        undefined,
        30,
      );

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("closes every pending report on the content in the same transaction", async () => {
      prisma.review.findUnique.mockResolvedValue({ userId: 7 });
      prisma.report.findUnique.mockResolvedValue({
        id: 3,
        targetId: 5,
        targetType: TargetType.review,
      });

      await service.createModerationAction(
        moderator,
        ActionType.delete_content,
        5,
        TargetType.review,
        undefined,
        undefined,
        3,
      );

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.report.updateMany).toHaveBeenCalledWith({
        where: {
          status: ReportStatus.pending,
          OR: [{ targetId: 5, targetType: TargetType.review }],
        },
        data: {
          status: ReportStatus.action_taken,
          resolvedById: moderator.id,
          resolvedAt: expect.any(Date),
          moderationActionId: 50,
        },
      });
    });

    it("also closes reports on replies removed by the cascade", async () => {
      prisma.review.findUnique.mockResolvedValue({ userId: 7 });
      prisma.reviewReply.findMany.mockResolvedValue([{ id: 11 }, { id: 12 }]);

      await service.createModerationAction(
        moderator,
        ActionType.delete_content,
        5,
        TargetType.review,
      );

      expect(prisma.report.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: ReportStatus.pending,
            OR: [
              { targetId: 5, targetType: TargetType.review },
              { targetId: { in: [11, 12] }, targetType: TargetType.reply },
            ],
          },
        }),
      );
    });

    it("still closes pending reports when no reportId is given", async () => {
      prisma.review.findUnique.mockResolvedValue({ userId: 7 });

      await service.createModerationAction(moderator, ActionType.warn, 5, TargetType.review);

      expect(prisma.report.updateMany).toHaveBeenCalledTimes(1);
      expect(prisma.report.update).not.toHaveBeenCalled();
    });
  });

  describe("hasActiveBan", () => {
    it("looks for bans recorded against the user", async () => {
      prisma.moderationAction.findFirst.mockResolvedValue(null);

      await expect(service.hasActiveBan(7)).resolves.toBe(false);

      expect(prisma.moderationAction.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ targetId: 7, targetType: TargetType.user }),
        }),
      );
    });

    it("returns true when a ban is found", async () => {
      prisma.moderationAction.findFirst.mockResolvedValue({ id: 1 });

      await expect(service.hasActiveBan(7)).resolves.toBe(true);
    });

    it("considers only temporary and permanent bans", async () => {
      prisma.moderationAction.findFirst.mockResolvedValue(null);
      await service.hasActiveBan(7);

      expect(prisma.moderationAction.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: { in: [ActionType.ban_temp, ActionType.ban_perm] },
          }),
        }),
      );
    });
  });

  describe("security: select excludes hashedPassword", () => {
    const userPublicSelect = { id: true, username: true, role: true };
    const reportInclude = {
      reporter: { select: userPublicSelect },
      resolvedBy: { select: userPublicSelect },
      moderationAction: true,
    };
    const moderationActionInclude = {
      moderator: { select: userPublicSelect },
    };

    it("createReport passes select that excludes hashedPassword", async () => {
      prisma.report.findFirst.mockResolvedValue(null);
      prisma.review.findUnique.mockResolvedValue({ id: 5, userId: 7 });
      prisma.report.create.mockResolvedValue({ id: 9 });

      await service.createReport(5, TargetType.review, { id: 1 } as any, "spam", "x");

      expect(prisma.report.create).toHaveBeenCalledWith(
        expect.objectContaining({ include: expect.objectContaining(reportInclude) }),
      );
      const passedInclude = (prisma.report.create.mock.calls[0][0] as any).include;
      expect(passedInclude.reporter.select).not.toHaveProperty("hashedPassword");
      expect(passedInclude.resolvedBy.select).not.toHaveProperty("hashedPassword");
    });

    it("getReports passes select that excludes hashedPassword", async () => {
      prisma.report.findMany.mockResolvedValue([]);
      prisma.report.count.mockResolvedValue(0);

      await service.getReports({});

      expect(prisma.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ include: expect.objectContaining(reportInclude) }),
      );
      const passedInclude = (prisma.report.findMany.mock.calls[0][0] as any).include;
      expect(passedInclude.reporter.select).not.toHaveProperty("hashedPassword");
      expect(passedInclude.resolvedBy.select).not.toHaveProperty("hashedPassword");
    });

    it("resolveReport passes select that excludes hashedPassword", async () => {
      prisma.report.findUnique.mockResolvedValue({ id: 1, status: ReportStatus.pending });
      prisma.report.update.mockResolvedValue({ id: 1 });

      await service.resolveReport(1, { id: 2 } as any, ReportStatus.dismissed);

      expect(prisma.report.update).toHaveBeenCalledWith(
        expect.objectContaining({ include: expect.objectContaining(reportInclude) }),
      );
      const passedInclude = (prisma.report.update.mock.calls[0][0] as any).include;
      expect(passedInclude.reporter.select).not.toHaveProperty("hashedPassword");
      expect(passedInclude.resolvedBy.select).not.toHaveProperty("hashedPassword");
    });

    it("createModerationAction passes select that excludes hashedPassword", async () => {
      prisma.review.findUnique.mockResolvedValue({ userId: 7 });
      prisma.moderationAction.create.mockResolvedValue({ id: 1 });

      await service.createModerationAction({ id: 2 } as any, ActionType.warn, 5, TargetType.review);

      expect(prisma.moderationAction.create).toHaveBeenCalledWith(
        expect.objectContaining({ include: expect.objectContaining(moderationActionInclude) }),
      );
      const passedInclude = (prisma.moderationAction.create.mock.calls[0][0] as any).include;
      expect(passedInclude.moderator.select).not.toHaveProperty("hashedPassword");
    });
  });
});