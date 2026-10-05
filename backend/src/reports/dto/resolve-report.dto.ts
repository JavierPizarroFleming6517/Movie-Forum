import { IsEnum, IsOptional, IsInt, Min } from "class-validator";
import { ReportStatus } from "@prisma/client";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ResolveReportDto {
  @ApiProperty({
    enum: ReportStatus,
    example: ReportStatus.action_taken,
    description:
      "Resultado de la resolución: `dismissed` (sin sanctioned) o `action_taken` (con acción de moderación).",
  })
  @IsEnum(ReportStatus)
  status!: ReportStatus;

  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    description:
      "ID de la acción de moderación aplicada. Obligatorio cuando `status` es `action_taken`.",
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  moderationActionId?: number;
}