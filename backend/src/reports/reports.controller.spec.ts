import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { ActionType, ReportStatus, TargetType, User } from "@prisma/client";

const reqUser = { user: { id: 1, role: "admin" } as User };

describe("ReportsController", () => {
  let service: {
    createReport: jest.Mock;
    getReports: jest.Mock;
    resolveReport: jest.Mock;
    createModerationAction: jest.Mock;
  };
  let controller: ReportsController;

  beforeEach(() => {
    service = {
      createReport: jest.fn().mockResolvedValue({ id: 1 }),
      getReports: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
      resolveReport: jest.fn().mockResolvedValue({ id: 1 }),
      createModerationAction: jest.fn().mockResolvedValue({ id: 50 }),
    };
    controller = new ReportsController(service as unknown as ReportsService);
  });

  it("reports a review", async () => {
    await controller.reportReview(5, { type: "spam", reason: "x" } as any, reqUser);

    expect(service.createReport).toHaveBeenCalledWith(
      5,
      TargetType.review,
      reqUser.user,
      "spam",
      "x",
    );
  });

  it("reports a reply", async () => {
    await controller.reportReply(9, { type: "spoiler", reason: "x" } as any, reqUser);

    expect(service.createReport).toHaveBeenCalledWith(
      9,
      TargetType.reply,
      reqUser.user,
      "spoiler",
      "x",
    );
  });

  it("lists reports with every supported filter", async () => {
    await controller.listReports(ReportStatus.pending, "spam", "ana", 2, 10);

    expect(service.getReports).toHaveBeenCalledWith({
      status: ReportStatus.pending,
      type: "spam",
      search: "ana",
      page: 2,
      limit: 10,
    });
  });

  it("resolves a report", async () => {
    await controller.resolveReport(3, { status: ReportStatus.dismissed } as any, reqUser);

    expect(service.resolveReport).toHaveBeenCalledWith(
      3,
      reqUser.user,
      ReportStatus.dismissed,
      undefined,
    );
  });

  it("creates a moderation action forwarding the reportId", async () => {
    await controller.createModerationAction(
      {
        type: ActionType.ban_temp,
        targetId: 5,
        targetType: TargetType.review,
        reason: "spam",
        durationDays: 7,
        reportId: 3,
      } as any,
      reqUser,
    );

    expect(service.createModerationAction).toHaveBeenCalledWith(
      reqUser.user,
      "ban_temp",
      5,
      TargetType.review,
      "spam",
      7,
      3,
    );
  });

  it("applies the action in a single call so no extra resolve is needed", async () => {
    await controller.createModerationAction(
      { type: ActionType.delete_content, targetId: 5, targetType: TargetType.review } as any,
      reqUser,
    );

    expect(service.createModerationAction).toHaveBeenCalledTimes(1);
    expect(service.resolveReport).not.toHaveBeenCalled();
  });
});