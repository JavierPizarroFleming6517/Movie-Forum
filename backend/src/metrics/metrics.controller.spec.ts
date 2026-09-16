import { MetricsController } from "./metrics.controller";
import { PrismaService } from "../prisma/prisma.service";

describe("MetricsController", () => {
  it("aggregates counts and top titles", async () => {
    const prisma = {
      user: { count: jest.fn().mockResolvedValue(3) },
      pelicula: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([{ id: 111, titulo: "Dune" }]),
      },
      review: {
        count: jest.fn().mockResolvedValue(4),
        aggregate: jest.fn().mockResolvedValue({ _avg: { rating: 8.25 } }),
        groupBy: jest.fn().mockResolvedValue([
          { peliculaId: 111, _avg: { rating: 9.1 }, _count: { id: 2 } },
          { peliculaId: 999, _avg: { rating: null }, _count: { id: 1 } },
        ]),
      },
    };
    const controller = new MetricsController(prisma as unknown as PrismaService);
    const result = await controller.metrics();
    expect(prisma.review.groupBy).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }));
    expect(result.users).toBe(3);
    expect(result.global_average_rating).toBe(8.25);
    expect(result.top_titles[0]).toMatchObject({ id: 111, title: "Dune", average_rating: 9.1 });
    expect(result.top_titles[1].title).toBe("Sin título");
    expect(result.top_titles[1].average_rating).toBe(0);
  });

  it("returns a null global average when there are no ratings", async () => {
    const prisma = {
      user: { count: jest.fn().mockResolvedValue(0) },
      pelicula: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      review: {
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({ _avg: { rating: null } }),
        groupBy: jest.fn().mockResolvedValue([]),
      },
    };
    const controller = new MetricsController(prisma as unknown as PrismaService);
    await expect(controller.metrics()).resolves.toMatchObject({
      reviews: 0,
      global_average_rating: null,
      top_titles: [],
    });
  });
});
