import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ReportStatus, TargetType, ActionType, Report, ModerationAction, User } from "@prisma/client";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(
    targetId: number,
    targetType: TargetType,
    reporter: User,
    type: string,
    reason: string,
  ): Promise<Report> {
    const existingReport = await this.prisma.report.findFirst({
      where: {
        targetId,
        targetType,
        reporterId: reporter.id,
        status: ReportStatus.pending,
      },
    });
    if (existingReport) {
      throw new BadRequestException("Ya has reportado este contenido");
    }

    const target = await this.getTarget(targetId, targetType);
    if (!target) {
      throw new NotFoundException("Contenido no encontrado");
    }
    if (target.userId === reporter.id) {
      throw new ForbiddenException("No puedes reportar tu propio contenido");
    }

    return this.prisma.report.create({
      data: {
        type: type as any,
        reason,
        targetId,
        targetType,
        reporterId: reporter.id,
      },
      include: { reporter: true, resolvedBy: true, moderationAction: true },
    });
  }

  async getReports(params: {
    status?: ReportStatus;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Report[]; total: number; page: number; limit: number }> {
    const { status, type, page = 1, limit = 20 } = params;
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [data, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        include: { reporter: true, resolvedBy: true, moderationAction: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.report.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async resolveReport(
    reportId: number,
    moderator: User,
    status: ReportStatus,
    moderationActionId?: number,
  ): Promise<Report> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: { moderationAction: true },
    });
    if (!report) {
      throw new NotFoundException("Reporte no encontrado");
    }
    if (report.status !== ReportStatus.pending) {
      throw new BadRequestException("El reporte ya fue resuelto");
    }

    const data: any = {
      status,
      resolvedById: moderator.id,
      resolvedAt: new Date(),
    };
    if (moderationActionId) {
      data.moderationActionId = moderationActionId;
    }

    return this.prisma.report.update({
      where: { id: reportId },
      data,
      include: { reporter: true, resolvedBy: true, moderationAction: true },
    });
  }

  async createModerationAction(
    moderator: User,
    type: ActionType,
    targetId: number,
    targetType: TargetType,
    reason?: string,
    durationDays?: number,
  ): Promise<ModerationAction> {
    const expiresAt = durationDays
      ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      : type === ActionType.ban_perm
        ? new Date("2099-12-31")
        : null;

    if (type === ActionType.delete_content) {
      if (targetType === TargetType.review) {
        await this.prisma.review.delete({ where: { id: targetId } });
      } else {
        await this.prisma.reviewReply.delete({ where: { id: targetId } });
      }
    }

    if (type === ActionType.ban_temp || type === ActionType.ban_perm) {
      await this.prisma.user.update({
        where: { id: targetId },
        data: { isActive: false },
      });
    }

    const action = await this.prisma.moderationAction.create({
      data: {
        type,
        targetId,
        targetType,
        moderatorId: moderator.id,
        reason,
        durationDays,
        expiresAt,
      },
      include: { moderator: true },
    });

    await this.autoDismissReports(targetId, targetType);

    return action;
  }

  async autoDismissReports(targetId: number, targetType: TargetType): Promise<void> {
    await this.prisma.report.updateMany({
      where: {
        targetId,
        targetType,
        status: ReportStatus.pending,
      },
      data: {
        status: ReportStatus.action_taken,
        resolvedAt: new Date(),
      },
    });
  }

  async hasActiveBan(userId: number): Promise<boolean> {
    const now = new Date();
    const ban = await this.prisma.moderationAction.findFirst({
      where: {
        targetId: userId,
        targetType: TargetType.reply,
        type: { in: [ActionType.ban_temp, ActionType.ban_perm] },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
    return !!ban;
  }

  private async getTarget(targetId: number, targetType: TargetType) {
    if (targetType === TargetType.review) {
      return this.prisma.review.findUnique({ where: { id: targetId } });
    }
    return this.prisma.reviewReply.findUnique({ where: { id: targetId } });
  }
}