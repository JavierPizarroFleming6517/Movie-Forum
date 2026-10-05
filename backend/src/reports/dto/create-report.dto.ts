import { IsEnum, IsString, MaxLength, MinLength } from "class-validator";
import { ReportType } from "@prisma/client";
import { ApiProperty } from "@nestjs/swagger";

export class CreateReportDto {
  @ApiProperty({
    enum: ReportType,
    example: ReportType.spam,
    description: "Motivo principal del reporte. El enum se deriva del modelo Prisma.",
  })
  @IsEnum(ReportType)
  type!: ReportType;

  @ApiProperty({
    example: "Reseña con enlaces promocionales a sitios externos.",
    minLength: 1,
    maxLength: 500,
    description: "Descripción obligatoria del reporte (máx. 500 caracteres).",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}