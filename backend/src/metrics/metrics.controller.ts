import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { IsIn, IsOptional } from "class-validator";
import { Type } from "class-transformer";
import { AdminGuard } from "../auth/admin.guard";
import { MetricsService } from "./metrics.service";

export class MetricsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsIn([7, 30, 90])
  days?: number;
}

@Controller("api/v1/metrics")
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @UseGuards(AuthGuard("jwt"), AdminGuard)
  metrics(@Query() query: MetricsQueryDto) {
    return this.metricsService.getMetrics({ days: query.days });
  }
}