import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { IsInt, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { Type } from "class-transformer";
import { User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { TmdbService } from "../tmdb/tmdb.service";
import { storageId, TV } from "../tmdb/tmdb.client";

function itemId(tmdbId: number, media?: string) {
  return storageId(tmdbId, media === "serie" || media === TV ? TV : undefined);
}

function canModerate(user: User, ownerId: number) {
  return user.id === ownerId || user.role === "admin";
}

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

export class ReplyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  comment!: string;
}

type ReplyRow = {
  id: number;
  userId: number;
  comment: string;
  createdAt: Date;
  user: { username: string };
};

type ReviewRow = {
  id: number;
  userId: number;
  rating: number;
  comment: string;
  createdAt: Date;
  user: { username: string };
  replies?: ReplyRow[];
};

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

  async listRecentReviews(limit = 10) {
    const reviews = await this.prisma.review.findMany({
      include: { user: true, pelicula: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return reviews.map((review) => ({
      id: review.id,
      user_id: review.userId,
      username: review.user.username,
      pelicula_id: review.peliculaId,
      titulo: review.pelicula.titulo,
      poster_url: review.pelicula.posterUrl,
      rating: review.rating,
      comment: review.comment,
      created_at: review.createdAt,
    }));
  }

  async listReviews(peliculaId: number, media?: string) {
    const id = itemId(peliculaId, media);
    const pelicula = await this.prisma.pelicula.findUnique({ where: { id } });
    if (!pelicula) return [];
    const reviews = await this.prisma.review.findMany({
      where: { peliculaId: id },
      include: { user: true, replies: { include: { user: true }, orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    return reviews.map((review) => this.toReviewRead(review, peliculaId));
  }

  async upsertReview(peliculaId: number, user: User, payload: ReviewDto, media?: string) {
    const id = itemId(peliculaId, media);
    const pelicula = await this.prisma.pelicula.findUnique({ where: { id } });
    if (!pelicula) throw new HttpException("Película no encontrada", HttpStatus.NOT_FOUND);
    const review = await this.prisma.review.upsert({
      where: { userId_peliculaId: { userId: user.id, peliculaId: id } },
      create: { userId: user.id, peliculaId: id, rating: payload.rating, comment: payload.comment },
      update: { rating: payload.rating, comment: payload.comment },
      include: { user: true, replies: { include: { user: true }, orderBy: { createdAt: "asc" } } },
    });
    return this.toReviewRead(review, peliculaId);
  }

  async deleteReview(peliculaId: number, user: User, media?: string) {
    const id = itemId(peliculaId, media);
    const review = await this.prisma.review.findUnique({
      where: { userId_peliculaId: { userId: user.id, peliculaId: id } },
    });
    if (!review) throw new HttpException("Reseña no encontrada", HttpStatus.NOT_FOUND);
    await this.prisma.review.delete({ where: { id: review.id } });
  }

  async addReply(reviewId: number, user: User, payload: ReplyDto) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new HttpException("Reseña no encontrada", HttpStatus.NOT_FOUND);
    const reply = await this.prisma.reviewReply.create({
      data: { reviewId, userId: user.id, comment: payload.comment },
      include: { user: true },
    });
    return this.toReplyRead(reply);
  }

  async updateReply(replyId: number, user: User, payload: ReplyDto) {
    const reply = await this.prisma.reviewReply.findUnique({ where: { id: replyId } });
    if (!reply) throw new HttpException("Respuesta no encontrada", HttpStatus.NOT_FOUND);
    if (!canModerate(user, reply.userId)) throw new HttpException("No puedes editar esta respuesta", HttpStatus.FORBIDDEN);
    const updated = await this.prisma.reviewReply.update({
      where: { id: replyId },
      data: { comment: payload.comment },
      include: { user: true },
    });
    return this.toReplyRead(updated);
  }

  async deleteReply(replyId: number, user: User) {
    const reply = await this.prisma.reviewReply.findUnique({ where: { id: replyId } });
    if (!reply) throw new HttpException("Respuesta no encontrada", HttpStatus.NOT_FOUND);
    if (!canModerate(user, reply.userId)) throw new HttpException("No puedes borrar esta respuesta", HttpStatus.FORBIDDEN);
    await this.prisma.reviewReply.delete({ where: { id: replyId } });
  }

  private toReviewRead(review: ReviewRow, peliculaId: number) {
    return {
      id: review.id,
      user_id: review.userId,
      username: review.user.username,
      pelicula_id: peliculaId,
      rating: review.rating,
      comment: review.comment,
      created_at: review.createdAt,
      replies: (review.replies || []).map((reply) => this.toReplyRead(reply)),
    };
  }

  private toReplyRead(reply: ReplyRow) {
    return {
      id: reply.id,
      user_id: reply.userId,
      username: reply.user.username,
      comment: reply.comment,
      created_at: reply.createdAt,
    };
  }
}
