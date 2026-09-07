import { StatusController } from "./status.controller";
import { PrismaService } from "../prisma/prisma.service";

describe("StatusController", () => {
  it("reports ok when the database answers", async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }]) };
    const controller = new StatusController(prisma as unknown as PrismaService);
    await expect(controller.status()).resolves.toEqual({
      status: "ok",
      service: "movie-forum-api",
      db: "up",
    });
  });

  it("reports degraded when the database is down", async () => {
    const prisma = { $queryRaw: jest.fn().mockRejectedValue(new Error("offline")) };
    const controller = new StatusController(prisma as unknown as PrismaService);
    await expect(controller.status()).resolves.toEqual({
      status: "degraded",
      service: "movie-forum-api",
      db: "down",
    });
  });
});
