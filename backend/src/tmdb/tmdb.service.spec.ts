import { HttpException, HttpStatus } from "@nestjs/common";
import { TmdbService } from "./tmdb.service";
import { TmdbClient, MOVIE, TV } from "./tmdb.client";
import { PrismaService } from "../prisma/prisma.service";

const page = (title = "Dune") => ({
  results: [
    {
      id: 111,
      title,
      poster_path: "/d.jpg",
      release_date: "2021-10-01",
      overview: "Arena",
      vote_average: 8.2,
    },
  ],
});

describe("TmdbService", () => {
  let client: Record<string, jest.Mock>;
  let prisma: {
    review: { groupBy: jest.Mock };
    pelicula: { findUnique: jest.Mock; upsert: jest.Mock };
  };
  let service: TmdbService;

  beforeEach(() => {
    client = {
      fetchPopularMovies: jest.fn().mockResolvedValue(page("Popular")),
      fetchTrendingMovies: jest.fn().mockResolvedValue(page("Trend")),
      fetchTopRatedMovies: jest.fn().mockResolvedValue(page("Top")),
      fetchNowPlayingMovies: jest.fn().mockResolvedValue(page("Now")),
      fetchUpcomingMovies: jest.fn().mockResolvedValue(page("Soon")),
      discoverMovies: jest.fn().mockResolvedValue(page("Genre")),
      fetchPopularTv: jest.fn().mockResolvedValue({ results: [{ id: 2, name: "Serie" }] }),
      fetchTrendingTv: jest.fn().mockResolvedValue({ results: [{ id: 3, original_name: "OG" }] }),
      fetchTopRatedTv: jest.fn().mockResolvedValue({ results: [] }),
      fetchOnTheAirTv: jest.fn().mockResolvedValue(page("Air")),
      fetchAiringTodayTv: jest.fn().mockResolvedValue(page("Today")),
      discoverTv: jest.fn().mockResolvedValue(page("TvGenre")),
      searchMovies: jest.fn().mockResolvedValue(page("Buscada")),
      fetchGenres: jest.fn().mockResolvedValue([{ 28: "Acción", 18: "Drama" }, "tmdb"]),
      fetchMovie: jest.fn(),
      fetchMovieVideos: jest.fn(),
      fetchTvVideos: jest.fn(),
      fetchTrendingPeople: jest.fn().mockResolvedValue({
        results: [
          {
            id: 7,
            name: "Ana",
            profile_path: "/a.jpg",
            known_for_department: "Acting",
            known_for: [{ title: "Dune" }, { name: "Serie" }],
          },
          { id: 8, name: "Director", known_for_department: "Directing" },
        ],
      }),
    };
    prisma = {
      review: { groupBy: jest.fn().mockResolvedValue([]) },
      pelicula: { findUnique: jest.fn(), upsert: jest.fn() },
    };
    service = new TmdbService(client as unknown as TmdbClient, prisma as unknown as PrismaService);
  });

  it("maps TMDB results with fallback titles", () => {
    expect(
      service.mapResults({
        results: [
          { id: 1, original_title: "Solo original" },
          { id: 2 },
          { id: 3, name: "Serie" },
        ],
      }),
    ).toEqual([
      expect.objectContaining({ id: 1, titulo: "Solo original", poster_url: null }),
      expect.objectContaining({ id: 2, titulo: "Sin título" }),
      expect.objectContaining({ id: 3, titulo: "Serie" }),
    ]);
  });

  it("lists trending actors", async () => {
    await expect(service.listPeople()).resolves.toEqual({
      title: "Rostros de la semana",
      results: [
        {
          id: 7,
          nombre: "Ana",
          foto_url: "https://image.tmdb.org/t/p/w500/a.jpg",
          departamento: "Acting",
          obras: ["Dune", "Serie"],
        },
      ],
    });
  });

  it("searches and lists populares", async () => {
    await expect(service.search("dune")).resolves.toMatchObject({ query: "dune" });
    await expect(service.populares(2)).resolves.toMatchObject({ source: "popular", page: 2 });
    expect(client.fetchPopularMovies).toHaveBeenCalledWith(2);
  });

  it("builds home rows and skips failed kinds", async () => {
    client.fetchTrendingMovies.mockRejectedValue(new Error("fail"));
    const home = await service.listHome();
    expect(home.rows.some((row) => row.id === "popular")).toBe(true);
    expect(home.rows.some((row) => row.id === "trending")).toBe(false);
    expect(home.rows.find((row) => row.id === "popular")?.results).toHaveLength(1);
  });

  it("builds TV home rows from collections and genres", async () => {
    const home = await service.listTvHome();
    expect(home.rows.some((row) => row.id === "tv_popular")).toBe(true);
    expect(home.rows.some((row) => row.id === "tv_top_rated")).toBe(false);
    expect(home.rows.some((row) => row.id === "tv_drama")).toBe(true);
  });

  it("lists a movie genre and rejects unknown ones", async () => {
    await expect(service.listGenre(28)).resolves.toMatchObject({ title: "Acción", media: MOVIE });
    client.fetchGenres.mockResolvedValue([{}, "local"]);
    await expect(service.listGenre(1)).rejects.toBeInstanceOf(HttpException);
  });

  it("lists a TV genre and rejects an unknown media type", async () => {
    await expect(service.listGenre(18, 1, TV)).resolves.toMatchObject({ media: TV });
    await expect(service.listGenre(18, 1, "otro")).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
  });

  it("lists collections and rejects unknown keys", async () => {
    await expect(service.listCollection(MOVIE, "populares", 2)).resolves.toMatchObject({
      title: "Las más populares",
    });
    await expect(service.listCollection("otro", "populares")).rejects.toBeInstanceOf(HttpException);
    await expect(service.listCollection(MOVIE, "nope")).rejects.toBeInstanceOf(HttpException);
  });

  it("lists genres sorted by name", async () => {
    const listed = await service.listGenres(MOVIE);
    expect(listed.results[0].nombre).toBe("Acción");
    await expect(service.listGenres("otro")).rejects.toBeInstanceOf(HttpException);
  });

  it("builds the sidebar menu", async () => {
    const menu = await service.buildMenu();
    expect(menu.secciones).toHaveLength(2);
    expect(menu.secciones[0].colecciones[0].clave).toBe("populares");
  });

  it("picks an official trailer, then a teaser, then fails", async () => {
    client.fetchMovieVideos
      .mockResolvedValueOnce({
        results: [{ site: "YouTube", key: "abc", type: "Trailer", official: true, name: "Oficial" }],
      })
      .mockResolvedValueOnce({ results: [] })
      .mockResolvedValueOnce({
        results: [{ site: "YouTube", key: "tes", type: "Teaser", official: false }],
      })
      .mockResolvedValue({ results: [] });

    await expect(service.getTrailer(111)).resolves.toMatchObject({
      clave: "abc",
      url: "https://www.youtube.com/watch?v=abc",
    });
    await expect(service.getTrailer(111)).resolves.toMatchObject({ clave: "tes" });
    await expect(service.getTrailer(111)).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
  });

  it("looks up a TV trailer and ignores language errors", async () => {
    client.fetchTvVideos
      .mockRejectedValueOnce(new Error("es"))
      .mockResolvedValueOnce({
        results: [{ site: "YouTube", key: "tv1", type: "Trailer", official: true }],
      });
    await expect(service.getTrailer(9, TV)).resolves.toMatchObject({ clave: "tv1" });
  });

  it("returns a cached movie that already has credits", async () => {
    const stored = {
      id: 111,
      titulo: "Dune",
      posterUrl: "/d.jpg",
      detallesExtra: { credits: { cast: [] } },
    };
    prisma.pelicula.findUnique.mockResolvedValue(stored);
    prisma.review.groupBy.mockResolvedValue([
      { peliculaId: 111, _count: { id: 2 }, _avg: { rating: 8.255 } },
    ]);
    const read = await service.getOrImport(111);
    expect(read.average_rating).toBe(8.26);
    expect(client.fetchMovie).not.toHaveBeenCalled();
  });

  it("imports a movie from TMDB when it is missing", async () => {
    prisma.pelicula.findUnique.mockResolvedValue(null);
    client.fetchMovie.mockResolvedValue({
      id: 111,
      title: "Dune",
      poster_path: "/d.jpg",
      overview: "Arena",
    });
    prisma.pelicula.upsert.mockResolvedValue({
      id: 111,
      titulo: "Dune",
      posterUrl: "https://image.tmdb.org/t/p/w500/d.jpg",
      detallesExtra: { overview: "Arena" },
    });
    const read = await service.getOrImport(111);
    expect(read.titulo).toBe("Dune");
    expect(read.review_count).toBe(0);
    expect(prisma.pelicula.upsert).toHaveBeenCalled();
  });

  it("persists a TMDB payload with a fallback title", async () => {
    prisma.pelicula.upsert.mockResolvedValue({
      id: 5,
      titulo: "Sin título",
      posterUrl: null,
      detallesExtra: {},
    });
    await service.persistFromTmdb({ id: "5", overview: "x" });
    expect(prisma.pelicula.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ id: 5, titulo: "Sin título", posterUrl: null }),
      }),
    );
  });
});
