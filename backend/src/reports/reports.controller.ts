import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ReportsService } from "./reports.service";
import { CreateReportDto } from "./dto/create-report.dto";
import { ResolveReportDto } from "./dto/resolve-report.dto";
import { CreateModerationActionDto } from "./dto/create-moderation-action.dto";
import { AdminGuard } from "../auth/admin.guard";
import { ReportStatus, TargetType, ActionType } from "@prisma/client";

@Controller("api/v1")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post("reviews/:id/report")
  @UseGuards(AuthGuard("jwt"))
  
  async reportReview(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateReportDto,
    @Req() req: { user: any },
  ) {
    return this.reports.createReport(id, TargetType.review, req.user, dto.type, dto.reason);
  }

  @Post("replies/:id/report")
  @UseGuards(AuthGuard("jwt"))
  
  async reportReply(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateReportDto,
    @Req() req: { user: any },
  ) {
    return this.reports.createReport(id, TargetType.reply, req.user, dto.type, dto.reason);
  }

  @Get("admin/reports")
  @UseGuards(AuthGuard("jwt"), AdminGuard)
  
  async listReports(
    @Query("status") status?: ReportStatus,
    @Query("type") type?: string,
    @Query("search") search?: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.reports.getReports({ status, type, search, page, limit });
  }

  @Patch("admin/reports/:id")
  @UseGuards(AuthGuard("jwt"), AdminGuard)
  
  async resolveReport(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ResolveReportDto,
    @Req() req: { user: any },
  ) {
    return this.reports.resolveReport(id, req.user, dto.status, dto.moderationActionId);
  }

  @Post("admin/moderation-actions")
  @UseGuards(AuthGuard("jwt"), AdminGuard)
  
  async createModerationAction(
    @Body() dto: CreateModerationActionDto,
    @Req() req: { user: any },
  ) {
    return this.reports.createModerationAction(
      req.user,
      dto.type,
      dto.targetId,
      dto.targetType,
      dto.reason,
      dto.durationDays,
      dto.reportId,
    );
  }
}