import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("api/v1/metrics")
export class MetricsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async metrics() {
    const [users, titles, reviews, avg] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.pelicula.count(),
      this.prisma.review.count(),
      this.prisma.review.aggregate({ _avg: { rating: true } }),
    ]);
    const top = await this.prisma.review.groupBy({
      by: ["peliculaId"],
      _avg: { rating: true },
      _count: { id: true },
      orderBy: { _avg: { rating: "desc" } },
      take: 5,
    });
    const movies = await this.prisma.pelicula.findMany({
      where: { id: { in: top.map((row) => row.peliculaId) } },
    });
    const byId = new Map(movies.map((item) => [item.id, item]));
    return {
      users,
      titles,
      reviews,
      global_average_rating: avg._avg.rating != null ? Math.round(avg._avg.rating * 100) / 100 : null,
      top_titles: top.map((row) => ({
        id: row.peliculaId,
        title: byId.get(row.peliculaId)?.titulo || "Sin título",
        kind: "movie",
        average_rating: Math.round((row._avg.rating || 0) * 100) / 100,
        review_count: row._count.id,
      })),
    };
  }
}
