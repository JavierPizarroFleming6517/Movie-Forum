import { HttpException, HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TmdbClient, buildBackdropUrl, buildPosterUrl, MOVIE, TMDB_API } from "./tmdb.client";

describe("buildPosterUrl", () => {
  it("builds a w500 URL or returns null", () => {
    expect(buildPosterUrl("/x.jpg")).toBe("https://image.tmdb.org/t/p/w500/x.jpg");
    expect(buildPosterUrl(null)).toBeNull();
    expect(buildPosterUrl()).toBeNull();
  });
});

describe("buildBackdropUrl", () => {
  it("builds a wide backdrop URL or returns null", () => {
    expect(buildBackdropUrl("/b.jpg")).toBe("https://image.tmdb.org/t/p/w1280/b.jpg");
    expect(buildBackdropUrl(null)).toBeNull();
  });
});

describe("TmdbClient", () => {
  const config = { get: jest.fn() };
  let client: TmdbClient;
  const fetchMock = jest.fn();

  beforeEach(() => {
    config.get.mockReturnValue("key-123");
    client = new TmdbClient(config as unknown as ConfigService);
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("refuses to call TMDB without an API key", async () => {
    config.get.mockReturnValue("");
    await expect(client.get("/movie/1")).rejects.toMatchObject({
      status: HttpStatus.SERVICE_UNAVAILABLE,
    });
  });

  it("wraps network errors", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    await expect(client.get("/movie/1")).rejects.toBeInstanceOf(HttpException);
  });

  it("maps 404 and other HTTP errors", async () => {
    fetchMock.mockResolvedValueOnce({ status: 404, ok: false });
    await expect(client.get("/movie/1")).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
    fetchMock.mockResolvedValueOnce({ status: 500, ok: false });
    await expect(client.get("/movie/1")).rejects.toMatchObject({ status: HttpStatus.BAD_GATEWAY });
  });

  it("returns JSON on success and skips null extras", async () => {
    fetchMock.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ id: 1 }),
    });
    await expect(client.get("/movie/1", { page: 1, unused: undefined })).resolves.toEqual({ id: 1 });
    expect(String(fetchMock.mock.calls[0][0])).toContain(`${TMDB_API}/movie/1`);
    expect(String(fetchMock.mock.calls[0][0])).toContain("api_key=key-123");
  });

  it("exposes list helpers", async () => {
    const get = jest.spyOn(client, "get").mockResolvedValue({ results: [] });
    await client.fetchMovie(1);
    await client.fetchMovieVideos(1, "es-ES");
    await client.fetchTvVideos(2, "en-US");
    await client.searchMovies("dune");
    await client.fetchPopularMovies(2);
    await client.fetchTopRatedMovies();
    await client.fetchNowPlayingMovies();
    await client.fetchUpcomingMovies();
    await client.fetchTrendingMovies();
    await client.discoverMovies(28, 3);
    await client.discoverMovies();
    await client.fetchPopularTv();
    await client.fetchTopRatedTv();
    await client.fetchOnTheAirTv();
    await client.fetchAiringTodayTv();
    await client.fetchTrendingTv();
    await client.discoverTv(18);
    await client.discoverTv();
    expect(get).toHaveBeenCalled();
  });

  it("uses cached genres, TMDB lists, empty fallback, and errors", async () => {
    fetchMock.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({
        genres: [
          { id: 28, name: "action" },
          { id: 999, name: "nuevo" },
          { id: 0, name: "skip" },
        ],
      }),
    });
    const first = await client.fetchGenres(MOVIE);
    expect(first[1]).toBe("tmdb");
    expect(first[0][28]).toBe("Acción");
    expect(first[0][999]).toBe("Nuevo");
    const cached = await client.fetchGenres(MOVIE);
    expect(cached[1]).toBe("tmdb");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({ genres: [] }),
    });
    const emptyClient = new TmdbClient(config as unknown as ConfigService);
    const empty = await emptyClient.fetchGenres(MOVIE);
    expect(empty[1]).toBe("local");

    fetchMock.mockRejectedValueOnce(new Error("down"));
    const failClient = new TmdbClient(config as unknown as ConfigService);
    const fallback = await failClient.fetchGenres(MOVIE);
    expect(fallback[1]).toBe("local");
  });
});
