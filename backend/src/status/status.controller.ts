import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("status")
@Controller("api")
export class StatusController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("status")
  @ApiOperation({
    summary: "Health check del servicio",
    description:
      "Endpoint público usado por Docker y el frontend para verificar el estado de la API. " +
      "Ejecuta `SELECT 1` contra la base de datos: si falla, devuelve `degraded` en lugar de 500.",
  })
  @ApiOkResponse({
    description: "Estado del servicio y de la conexión a la base de datos.",
    schema: {
      example: { status: "ok", service: "movie-forum-api", db: "up" },
    },
  })
  async status() {
    let db = "up";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = "down";
    }
    return {
      status: db === "up" ? "ok" : "degraded",
      service: "movie-forum-api",
      db,
    };
  }
}