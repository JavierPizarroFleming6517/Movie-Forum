import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { IsIn, IsOptional } from "class-validator";
import { Type } from "class-transformer";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { AdminGuard } from "../auth/admin.guard";
import { MetricsService } from "./metrics.service";

export class MetricsQueryDto {
  @ApiPropertyOptional({
    example: 30,
    enum: [7, 30, 90],
    description:
      "Ventana temporal en días. Si se omite, devuelve el histórico completo (all-time) " +
      "con granularidad automática (diaria o mensual).",
  })
  @IsOptional()
  @Type(() => Number)
  @IsIn([7, 30, 90])
  days?: number;
}

@ApiTags("metrics")
@Controller("api/v1/metrics")
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @UseGuards(AuthGuard("jwt"), AdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({
    summary: "Métricas del panel de administración",
    description:
      "Agrega analítica de contenido y moderación en una sola llamada: totales de usuarios, " +
      "títulos y reseñas, puntuación media, distribución de estrellas, series temporales, " +
      "tops y la cola de reportes con tasas de resolución. " +
      "El histórico completo se devuelve cuando se omite `days` (granularidad automática " +
      "diaria o mensual según el tamaño del histórico). Solo accesible con rol `admin`.",
  })
  @ApiOkResponse({
    description: "Objeto de métricas. Incluye `range_days`, `timeline_granularity` y `generated_at`.",
    schema: {
      example: {
        users: 17,
        titles: 64,
        reviews: 367,
        global_average_rating: 3.53,
        range_days: null,
        timeline_granularity: "day",
        generated_at: "2026-10-05T17:00:27.347Z",
      },
    },
  })
  @ApiUnauthorizedResponse({ description: "Token ausente, inválido o expirado." })
  @ApiForbiddenResponse({ description: "El usuario no tiene rol `admin`." })
  metrics(@Query() query: MetricsQueryDto) {
    return this.metricsService.getMetrics({ days: query.days });
  }
}