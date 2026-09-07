import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("api")
export class StatusController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("status")
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
