import { HttpException, HttpStatus } from "@nestjs/common";
import { User } from "@prisma/client";
import { CatalogService } from "./catalog.service";
import { PrismaService } from "../prisma/prisma.service";
import { TmdbService } from "../tmdb/tmdb.service";

const user = {
  id: 1,
  email: "ana@foro.test",
  username: "ana",
  hashedPassword: "x",
  isActive: true,
  role: "user",
  createdAt: new Date(),
} as User;

const dune = { id: 111, titulo: "Dune", posterUrl: "/d.jpg", detallesExtra: {} };
const alien = { id: 222, titulo: "Alien", posterUrl: "/a.jpg", detallesExtra: {} };

describe("CatalogService", () => {
  let prisma: {
    review: { groupBy: jest.Mock; findMany: jest.Mock; upsert: jest.Mock; findUnique: jest.Mock; delete: jest.Mock };
    reviewReply: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock; delete: jest.Mock };
    pelicula: { findMany: jest.Mock; findUnique: jest.Mock };
  };
  let tmdb: { toRead: jest.Mock };
  let service: CatalogService;

  beforeEach(() => {
    prisma = {
      review: { groupBy: jest.fn(), findMany: jest.fn(), upsert: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
      reviewReply: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
      pelicula: { findMany: jest.fn(), findUnique: jest.fn() },
    };
    tmdb = {
      toRead: jest.fn((item, count, avg) => ({ id: item.id, titulo: item.titulo, count, avg })),
    };
    service = new CatalogService(prisma as unknown as PrismaService, tmdb as unknown as TmdbService);
  });

  it("returns an empty catalog when there are no reviews", async () => {
    prisma.review.groupBy.mockResolvedValue([]);
    await expect(service.listCatalog()).resolves.toEqual([]);
  });

  it("sorts by review count by default", async () => {
    prisma.review.groupBy.mockResolvedValue([
      { peliculaId: 111, _count: { id: 2 }, _avg: { rating: 9 } },
      { peliculaId: 222, _count: { id: 5 }, _avg: { rating: 7 } },
    ]);
    prisma.pelicula.findMany.mockResolvedValue([dune, alien]);
    const rows = await service.listCatalog("comentadas");
    expect(rows.map((row) => row.id)).toEqual([222, 111]);
  });

  it("sorts by average rating when asked", async () => {
    prisma.review.groupBy.mockResolvedValue([
      { peliculaId: 111, _count: { id: 2 }, _avg: { rating: 9 } },
      { peliculaId: 222, _count: { id: 5 }, _avg: { rating: 7 } },
    ]);
    prisma.pelicula.findMany.mockResolvedValue([dune, alien]);
    const rows = await service.listCatalog("valoradas");
    expect(rows.map((row) => row.id)).toEqual([111, 222]);
  });

  it("lists recent reviews with movie and user data", async () => {
    prisma.review.findMany.mockResolvedValue([
      {
        id: 9,
        userId: 1,
        peliculaId: 111,
        rating: 4,
        comment: "Buena",
        createdAt: new Date("2026-03-01"),
        user: { username: "ana" },
        pelicula: { titulo: "Dune", posterUrl: "/d.jpg" },
      },
    ]);
    await expect(service.listRecentReviews(8)).resolves.toEqual([
      {
        id: 9,
        user_id: 1,
        username: "ana",
        pelicula_id: 111,
        titulo: "Dune",
        poster_url: "/d.jpg",
        rating: 4,
        comment: "Buena",
        created_at: new Date("2026-03-01"),
      },
    ]);
    expect(prisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 8, orderBy: { createdAt: "desc" } }),
    );
  });

  it("looks up series reviews with the TV storage id", async () => {
    prisma.pelicula.findUnique.mockResolvedValue({
      id: 1_000_000_009,
      titulo: "Silo",
      posterUrl: "/s.jpg",
      detallesExtra: { media_type: "serie" },
    });
    prisma.review.findMany.mockResolvedValue([]);
    await service.listReviews(9, "serie");
    expect(prisma.pelicula.findUnique).toHaveBeenCalledWith({ where: { id: 1_000_000_009 } });
    expect(prisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { peliculaId: 1_000_000_009 } }),
    );
  });

  it("returns no reviews when the movie is not in the database", async () => {
    prisma.pelicula.findUnique.mockResolvedValue(null);
    await expect(service.listReviews(99)).resolves.toEqual([]);
  });

  it("maps stored reviews", async () => {
    prisma.pelicula.findUnique.mockResolvedValue(dune);
    prisma.review.findMany.mockResolvedValue([
      {
        id: 4,
        userId: 1,
        peliculaId: 111,
        rating: 8,
        comment: "Buena",
        createdAt: new Date("2026-02-01"),
        user: { username: "ana" },
        replies: [],
      },
    ]);
    await expect(service.listReviews(111)).resolves.toEqual([
      {
        id: 4,
        user_id: 1,
        username: "ana",
        pelicula_id: 111,
        rating: 8,
        comment: "Buena",
        created_at: new Date("2026-02-01"),
        replies: [],
      },
    ]);
  });

  it("rejects a review for a missing movie", async () => {
    prisma.pelicula.findUnique.mockResolvedValue(null);
    await expect(service.upsertReview(99, user, { rating: 8, comment: "x" })).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
    await expect(service.upsertReview(99, user, { rating: 8, comment: "x" })).rejects.toBeInstanceOf(
      HttpException,
    );
  });

  it("upserts a review", async () => {
    prisma.pelicula.findUnique.mockResolvedValue(dune);
    prisma.review.upsert.mockResolvedValue({
      id: 4,
      userId: 1,
      peliculaId: 111,
      rating: 9,
      comment: "Excelente",
      createdAt: new Date("2026-03-01"),
      user: { username: "ana" },
      replies: [],
    });
    const saved = await service.upsertReview(111, user, { rating: 9, comment: "Excelente" });
    expect(saved.rating).toBe(9);
    expect(saved.username).toBe("ana");
    expect(saved.replies).toEqual([]);
  });

  it("deletes the current user's review", async () => {
    prisma.review.findUnique.mockResolvedValue({ id: 4, userId: 1, peliculaId: 111 });
    prisma.review.delete.mockResolvedValue({ id: 4 });
    await service.deleteReview(111, user);
    expect(prisma.review.delete).toHaveBeenCalledWith({ where: { id: 4 } });
  });

  it("rejects deleting a missing review", async () => {
    prisma.review.findUnique.mockResolvedValue(null);
    await expect(service.deleteReview(111, user)).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
  });

  it("adds a reply to a review thread", async () => {
    prisma.review.findUnique.mockResolvedValue({ id: 4 });
    prisma.reviewReply.create.mockResolvedValue({
      id: 2,
      userId: 1,
      comment: "De acuerdo",
      createdAt: new Date("2026-04-01"),
      user: { username: "ana" },
    });
    await expect(service.addReply(4, user, { comment: "De acuerdo" })).resolves.toMatchObject({
      id: 2,
      username: "ana",
      comment: "De acuerdo",
    });
  });

  it("rejects a reply to a missing review", async () => {
    prisma.review.findUnique.mockResolvedValue(null);
    await expect(service.addReply(99, user, { comment: "x" })).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
  });

  it("updates an owned reply", async () => {
    prisma.reviewReply.findUnique.mockResolvedValue({ id: 2, userId: 1 });
    prisma.reviewReply.update.mockResolvedValue({
      id: 2,
      userId: 1,
      comment: "Editado",
      createdAt: new Date("2026-04-01"),
      user: { username: "ana" },
    });
    await expect(service.updateReply(2, user, { comment: "Editado" })).resolves.toMatchObject({ comment: "Editado" });
  });

  it("forbids editing someone else's reply", async () => {
    prisma.reviewReply.findUnique.mockResolvedValue({ id: 2, userId: 9 });
    await expect(service.updateReply(2, user, { comment: "x" })).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
  });

  it("lets an admin edit any reply", async () => {
    prisma.reviewReply.findUnique.mockResolvedValue({ id: 2, userId: 9 });
    prisma.reviewReply.update.mockResolvedValue({
      id: 2,
      userId: 9,
      comment: "Moderado",
      createdAt: new Date("2026-04-01"),
      user: { username: "otro" },
    });
    await expect(service.updateReply(2, { ...user, role: "admin" }, { comment: "Moderado" })).resolves.toMatchObject({
      comment: "Moderado",
    });
  });

  it("deletes an owned reply", async () => {
    prisma.reviewReply.findUnique.mockResolvedValue({ id: 2, userId: 1 });
    prisma.reviewReply.delete.mockResolvedValue({ id: 2 });
    await service.deleteReply(2, user);
    expect(prisma.reviewReply.delete).toHaveBeenCalledWith({ where: { id: 2 } });
  });
});
