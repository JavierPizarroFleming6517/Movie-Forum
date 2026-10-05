import { IsEnum, IsInt, Min, IsOptional, MaxLength, IsString } from "class-validator";
import { ActionType, TargetType } from "@prisma/client";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateModerationActionDto {
  @ApiProperty({
    enum: ActionType,
    example: ActionType.warn,
    description:
      "Acción aplicada: `warn`, `delete_content`, `ban_temp` o `ban_perm`. " +
      "`delete_content` no requiere `durationDays`; `ban_temp` sí lo exige.",
  })
  @IsEnum(ActionType)
  type!: ActionType;

  @ApiProperty({
    example: 42,
    minimum: 1,
    description: "ID del contenido (reseña o respuesta) sancionado.",
  })
  @IsInt()
  @Min(1)
  targetId!: number;

  @ApiProperty({
    enum: TargetType,
    example: TargetType.review,
    description: "Tipo de contenido sobre el que se aplica la acción.",
  })
  @IsEnum(TargetType)
  targetType!: TargetType;

  @ApiPropertyOptional({
    example: "Repetición de enlaces promocionales",
    maxLength: 500,
    description: "Justificación de la sanción. Se muestra en el historial de moderación.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    example: 7,
    minimum: 1,
    description: "Días de duración del baneo. Obligatorio para `ban_temp`, ignorado en el resto.",
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    description: "Reporte que origina la acción. Si se omite, la acción queda sin reporte asociado.",
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  reportId?: number;
}