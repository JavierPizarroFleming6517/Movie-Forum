import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { IsInt, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { Type } from "class-transformer";
import { User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { TmdbService } from "../tmdb/tmdb.service";

export class ReviewDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  comment!: string;
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tmdb: TmdbService,
  ) {}

  async listCatalog(orden: "comentadas" | "valoradas" = "comentadas") {
    const grouped = await this.prisma.review.groupBy({
      by: ["peliculaId"],
      _count: { id: true },
      _avg: { rating: true },
    });
    if (!grouped.length) return [];
    const stats = new Map(grouped.map((row) => [row.peliculaId, { count: row._count.id, avg: row._avg.rating }]));
    const items = await this.prisma.pelicula.findMany({
      where: { id: { in: [...stats.keys()] } },
    });
    items.sort((a, b) => {
      const sa = stats.get(a.id)!;
      const sb = stats.get(b.id)!;
      const ra = sa.avg || 0;
      const rb = sb.avg || 0;
      if (orden === "valoradas") {
        return rb - ra || sb.count - sa.count || a.titulo.localeCompare(b.titulo, "es");
      }
      return sb.count - sa.count || rb - ra || a.titulo.localeCompare(b.titulo, "es");
    });
    return items.map((item) => {
      const stat = stats.get(item.id)!;
      return this.tmdb.toRead(item, stat.count, stat.avg);
    });
  }

  async listReviews(peliculaId: number) {
    const pelicula = await this.prisma.pelicula.findUnique({ where: { id: peliculaId } });
    if (!pelicula) return [];
    const reviews = await this.prisma.review.findMany({
      where: { peliculaId },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });
    return reviews.map((review) => ({
      id: review.id,
      user_id: review.userId,
      username: review.user.username,
      pelicula_id: review.peliculaId,
      rating: review.rating,
      comment: review.comment,
      created_at: review.createdAt,
    }));
  }

  async upsertReview(peliculaId: number, user: User, payload: ReviewDto) {
    const pelicula = await this.prisma.pelicula.findUnique({ where: { id: peliculaId } });
    if (!pelicula) throw new HttpException("Película no encontrada", HttpStatus.NOT_FOUND);
    const review = await this.prisma.review.upsert({
      where: { userId_peliculaId: { userId: user.id, peliculaId } },
      create: { userId: user.id, peliculaId, rating: payload.rating, comment: payload.comment },
      update: { rating: payload.rating, comment: payload.comment },
      include: { user: true },
    });
    return {
      id: review.id,
      user_id: review.userId,
      username: review.user.username,
      pelicula_id: review.peliculaId,
      rating: review.rating,
      comment: review.comment,
      created_at: review.createdAt,
    };
  }
}
