import { IsEnum, IsString, MaxLength, MinLength } from "class-validator";
import { ReportType } from "@prisma/client";

export class CreateReportDto {
  @IsEnum(ReportType)
  type!: ReportType;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}