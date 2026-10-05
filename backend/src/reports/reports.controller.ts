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
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { ReportsService } from "./reports.service";
import { CreateReportDto } from "./dto/create-report.dto";
import { ResolveReportDto } from "./dto/resolve-report.dto";
import { CreateModerationActionDto } from "./dto/create-moderation-action.dto";
import { AdminGuard } from "../auth/admin.guard";
import { ReportStatus, TargetType, ActionType } from "@prisma/client";

@ApiTags("reports")
@Controller("api/v1")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post("reviews/:id/report")
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth("bearer")
  @ApiOperation({
    summary: "Reportar una reseña",
    description: "Crea un reporte contra una reseña. Valida que la reseña exista y bloquea el auto-reporte.",
  })
  @ApiParam({ name: "id", example: 42, description: "ID interno de la reseña reportada." })
  @ApiCreatedResponse({ description: "Reporte creado con estado `pending`." })
  @ApiUnauthorizedResponse({ description: "Token ausente, inválido o expirado." })
  @ApiForbiddenResponse({ description: "Intento de reportar contenido propio." })
  @ApiNotFoundResponse({ description: "La reseña no existe." })
  async reportReview(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateReportDto,
    @Req() req: { user: any },
  ) {
    return this.reports.createReport(id, TargetType.review, req.user, dto.type, dto.reason);
  }

  @Post("replies/:id/report")
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth("bearer")
  @ApiOperation({
    summary: "Reportar una respuesta",
    description: "Crea un reporte contra una respuesta de un hilo.",
  })
  @ApiParam({ name: "id", example: 5, description: "ID interno de la respuesta reportada." })
  @ApiCreatedResponse({ description: "Reporte creado con estado `pending`." })
  @ApiUnauthorizedResponse({ description: "Token ausente, inválido o expirado." })
  @ApiForbiddenResponse({ description: "Intento de reportar contenido propio." })
  @ApiNotFoundResponse({ description: "La respuesta no existe." })
  async reportReply(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateReportDto,
    @Req() req: { user: any },
  ) {
    return this.reports.createReport(id, TargetType.reply, req.user, dto.type, dto.reason);
  }

  @Get("admin/reports")
  @UseGuards(AuthGuard("jwt"), AdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({
    summary: "Listar reportes (admin)",
    description:
      "Listado paginado y filtrable de la cola de moderación. Solo accesible con rol `admin`; " +
      "la selección de usuario excluye el hash de contraseña.",
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ReportStatus,
    description: "Filtra por estado del reporte.",
  })
  @ApiQuery({ name: "type", required: false, description: "Filtra por tipo de reporte." })
  @ApiQuery({ name: "search", required: false, description: "Búsqueda por texto del motivo o autor." })
  @ApiQuery({ name: "page", required: false, example: 1, description: "Página (base 1)." })
  @ApiQuery({ name: "limit", required: false, example: 20, description: "Resultados por página (base 20)." })
  @ApiOkResponse({ description: "Página de reportes con el total de coincidencias." })
  @ApiUnauthorizedResponse({ description: "Token ausente, inválido o expirado." })
  @ApiForbiddenResponse({ description: "El usuario no tiene rol `admin`." })
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
  @ApiBearerAuth("bearer")
  @ApiOperation({
    summary: "Resolver un reporte (admin)",
    description:
      "Cierra el reporte como `dismissed` o `action_taken`. " +
      "Si se indica `moderationActionId`, la resolución y la acción se aplican en una única transacción.",
  })
  @ApiParam({ name: "id", example: 1, description: "ID interno del reporte." })
  @ApiOkResponse({ description: "Reporte actualizado con su estado final." })
  @ApiUnauthorizedResponse({ description: "Token ausente, inválido o expirado." })
  @ApiForbiddenResponse({ description: "El usuario no tiene rol `admin`." })
  @ApiNotFoundResponse({ description: "El reporte no existe o no está en estado `pending`." })
  @ApiConflictResponse({
    description: "`status` es `action_taken` pero no se indicó `moderationActionId`.",
  })
  async resolveReport(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ResolveReportDto,
    @Req() req: { user: any },
  ) {
    return this.reports.resolveReport(id, req.user, dto.status, dto.moderationActionId);
  }

  @Post("admin/moderation-actions")
  @UseGuards(AuthGuard("jwt"), AdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({
    summary: "Registrar una acción de moderación (admin)",
    description:
      "Aplica una sanción: advertencia, eliminación de contenido, baneo temporal o permanente. " +
      "Si se envía `reportId`, cierra el reporte asociado de forma atérica. " +
      "Los saneamientos (bans) se derivan de `ban_temp` / `ban_perm`.",
  })
  @ApiCreatedResponse({ description: "Acción registrada." })
  @ApiUnauthorizedResponse({ description: "Token ausente, inválido o expirado." })
  @ApiForbiddenResponse({
    description: "El admin intenta sancionarse a sí mismo, falta `durationDays` en un `ban_temp`, o el contenido no existe.",
  })
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