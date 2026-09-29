import { IsEnum, IsOptional, IsInt, Min } from "class-validator";
import { ReportStatus } from "@prisma/client";

export class ResolveReportDto {
  @IsEnum(ReportStatus)
  status!: ReportStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  moderationActionId?: number;
}