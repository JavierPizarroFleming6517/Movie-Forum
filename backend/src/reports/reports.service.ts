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
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Report[]; total: number; page: number; limit: number }> {
    const { status, type, search, page = 1, limit = 20 } = params;
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (search?.trim()) {
      where.OR = [
        { reason: { contains: search.trim(), mode: "insensitive" } },
        { reporter: { username: { contains: search.trim(), mode: "insensitive" } } },
      ];
    }

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
    reportId?: number,
  ): Promise<ModerationAction> {
    const isBan = type === ActionType.ban_temp || type === ActionType.ban_perm;
    const isContentAction = type === ActionType.warn || type === ActionType.delete_content;

    if (isBan && type === ActionType.ban_temp && !durationDays) {
      throw new BadRequestException("Un ban temporal requiere la cantidad de días");
    }
    if (isContentAction && targetType === TargetType.user) {
      throw new BadRequestException("Esta acción solo aplica a reseñas o respuestas");
    }

    // The author is who gets sanctioned. Content ids and user ids live in
    // different id spaces, so a ban must never reuse the content id.
    const authorId = await this.getTargetAuthorId(targetId, targetType);
    if (authorId === null) {
      throw new NotFoundException("El contenido a moderar no existe");
    }
    if (isBan && authorId === moderator.id) {
      throw new BadRequestException("No puedes aplicar una sanción a tu propia cuenta");
    }

    if (reportId) {
      const report = await this.prisma.report.findUnique({ where: { id: reportId } });
      if (!report) {
        throw new NotFoundException("Reporte no encontrado");
      }
      if (report.targetId !== targetId || report.targetType !== targetType) {
        throw new BadRequestException("El reporte no corresponde al contenido indicado");
      }
    }

    const actionTargetType = isBan ? TargetType.user : targetType;
    const actionTargetId = isBan ? authorId : targetId;
    const expiresAt =
      type === ActionType.ban_temp
        ? new Date(Date.now() + durationDays! * 24 * 60 * 60 * 1000)
        : null;

    return this.prisma.$transaction(async (tx) => {
      let cascadedReplyIds: number[] = [];

      if (type === ActionType.delete_content) {
        if (targetType === TargetType.review) {
          // Replies are removed by cascade, so their reports must be closed too.
          const replies = await tx.reviewReply.findMany({
            where: { reviewId: targetId },
            select: { id: true },
          });
          cascadedReplyIds = replies.map((r) => r.id);
          await tx.review.delete({ where: { id: targetId } });
        } else {
          await tx.reviewReply.delete({ where: { id: targetId } });
        }
      }

      const action = await tx.moderationAction.create({
        data: {
          type,
          targetId: actionTargetId,
          targetType: actionTargetType,
          moderatorId: moderator.id,
          reason,
          durationDays: isBan ? durationDays : null,
          expiresAt,
        },
        include: { moderator: true },
      });

      // Close every pending report on the same content in the same transaction,
      // so an admin never has to resolve them one by one.
      const targets: any[] = [{ targetId, targetType }];
      if (cascadedReplyIds.length > 0) {
        targets.push({ targetId: { in: cascadedReplyIds }, targetType: TargetType.reply });
      }

      await tx.report.updateMany({
        where: { status: ReportStatus.pending, OR: targets },
        data: {
          status: ReportStatus.action_taken,
          resolvedById: moderator.id,
          resolvedAt: new Date(),
          moderationActionId: action.id,
        },
      });

      return action;
    });
  }

  async hasActiveBan(userId: number): Promise<boolean> {
    const now = new Date();
    const ban = await this.prisma.moderationAction.findFirst({
      where: {
        targetId: userId,
        targetType: TargetType.user,
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
    if (targetType === TargetType.reply) {
      return this.prisma.reviewReply.findUnique({ where: { id: targetId } });
    }
    return null;
  }

  private async getTargetAuthorId(targetId: number, targetType: TargetType): Promise<number | null> {
    if (targetType === TargetType.review) {
      const review = await this.prisma.review.findUnique({
        where: { id: targetId },
        select: { userId: true },
      });
      return review?.userId ?? null;
    }
    if (targetType === TargetType.reply) {
      const reply = await this.prisma.reviewReply.findUnique({
        where: { id: targetId },
        select: { userId: true },
      });
      return reply?.userId ?? null;
    }
    const user = await this.prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    return user?.id ?? null;
  }
}