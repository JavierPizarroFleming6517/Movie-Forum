import { IsEnum, IsInt, Min, IsOptional, MaxLength, IsString } from "class-validator";
import { ActionType, TargetType } from "@prisma/client";

export class CreateModerationActionDto {
  @IsEnum(ActionType)
  type!: ActionType;

  @IsInt()
  @Min(1)
  targetId!: number;

  @IsEnum(TargetType)
  targetType!: TargetType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  reportId?: number;
}