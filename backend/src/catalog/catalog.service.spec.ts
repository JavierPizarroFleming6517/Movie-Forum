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
    review: { groupBy: jest.Mock; findMany: jest.Mock; upsert: jest.Mock };
    pelicula: { findMany: jest.Mock; findUnique: jest.Mock };
  };
  let tmdb: { toRead: jest.Mock };
  let service: CatalogService;

  beforeEach(() => {
    prisma = {
      review: { groupBy: jest.fn(), findMany: jest.fn(), upsert: jest.fn() },
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
    });
    const saved = await service.upsertReview(111, user, { rating: 9, comment: "Excelente" });
    expect(saved.rating).toBe(9);
    expect(saved.username).toBe("ana");
  });
});
