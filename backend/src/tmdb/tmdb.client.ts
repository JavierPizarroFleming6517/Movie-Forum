import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export const TMDB_API = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
export const MOVIE = "pelicula";
export const TV = "serie";

export const GENRES: Record<number, string> = {
  28: "Acción",
  12: "Aventura",
  16: "Animación",
  35: "Comedia",
  80: "Crimen",
  99: "Documental",
  18: "Drama",
  10751: "Familia",
  14: "Fantasía",
  36: "Historia",
  27: "Terror",
  10402: "Música",
  9648: "Misterio",
  10749: "Romance",
  878: "Ciencia ficción",
  10770: "Película de TV",
  53: "Suspense",
  10752: "Bélica",
  37: "Western",
};

export const TV_GENRES: Record<number, string> = {
  10759: "Acción y aventura",
  16: "Animación",
  35: "Comedia",
  80: "Crimen",
  99: "Documental",
  18: "Drama",
  10751: "Familia",
  10762: "Infantil",
  9648: "Misterio",
  10763: "Noticias",
  10764: "Telerrealidad",
  10765: "Ciencia ficción y fantasía",
  10766: "Telenovela",
  10767: "Entrevistas",
  10768: "Bélica y política",
  37: "Western",
};

export const FALLBACK_GENRES: Record<string, Record<number, string>> = {
  [MOVIE]: GENRES,
  [TV]: TV_GENRES,
};

const GENRE_PATHS: Record<string, string> = {
  [MOVIE]: "/genre/movie/list",
  [TV]: "/genre/tv/list",
};

const GENRE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export function buildPosterUrl(posterPath?: string | null): string | null {
  if (!posterPath) return null;
  return `${TMDB_IMAGE_BASE}${posterPath}`;
}

type TmdbJson = Record<string, unknown>;

@Injectable()
export class TmdbClient {
  private genreCache = new Map<string, { at: number; genres: Record<number, string> }>();

  constructor(private readonly config: ConfigService) {}

  private authParams(): Record<string, string> {
    const key = this.config.get<string>("TMDB_API_KEY") || "";
    if (!key) {
      throw new HttpException("Falta TMDB_API_KEY en backend/.env", HttpStatus.SERVICE_UNAVAILABLE);
    }
    return { api_key: key, language: "es-ES" };
  }

  async get(path: string, extra: Record<string, string | number | undefined> = {}): Promise<TmdbJson> {
    const params = new URLSearchParams(this.authParams());
    for (const [key, value] of Object.entries(extra)) {
      if (value !== undefined && value !== null) params.set(key, String(value));
    }
    let response: Response;
    try {
      response = await fetch(`${TMDB_API}${path}?${params.toString()}`);
    } catch (err) {
      throw new HttpException(`No se pudo consultar TMDB: ${err}`, HttpStatus.BAD_GATEWAY);
    }
    if (response.status === 404) {
      throw new HttpException("Película no encontrada en TMDB", HttpStatus.NOT_FOUND);
    }
    if (!response.ok) {
      throw new HttpException(`TMDB respondió ${response.status}`, HttpStatus.BAD_GATEWAY);
    }
    return (await response.json()) as TmdbJson;
  }

  fetchMovie(id: number) {
    return this.get(`/movie/${id}`, { append_to_response: "credits,keywords,recommendations,release_dates" });
  }

  fetchMovieVideos(id: number, language: string) {
    return this.get(`/movie/${id}/videos`, { language });
  }

  fetchTvVideos(id: number, language: string) {
    return this.get(`/tv/${id}/videos`, { language });
  }

  searchMovies(query: string) {
    return this.get("/search/movie", { query });
  }

  fetchPopularMovies(page = 1) {
    return this.get("/movie/popular", { page });
  }

  fetchTopRatedMovies(page = 1) {
    return this.get("/movie/top_rated", { page });
  }

  fetchNowPlayingMovies(page = 1) {
    return this.get("/movie/now_playing", { page });
  }

  fetchUpcomingMovies(page = 1) {
    return this.get("/movie/upcoming", { page });
  }

  fetchTrendingMovies(page = 1) {
    return this.get("/trending/movie/week", { page });
  }

  discoverMovies(genreId?: number, page = 1) {
    const extra: Record<string, string | number> = { page, sort_by: "popularity.desc", include_adult: "false" };
    if (genreId) extra.with_genres = genreId;
    return this.get("/discover/movie", extra);
  }

  fetchPopularTv(page = 1) {
    return this.get("/tv/popular", { page });
  }

  fetchTopRatedTv(page = 1) {
    return this.get("/tv/top_rated", { page });
  }

  fetchOnTheAirTv(page = 1) {
    return this.get("/tv/on_the_air", { page });
  }

  fetchAiringTodayTv(page = 1) {
    return this.get("/tv/airing_today", { page });
  }

  fetchTrendingTv(page = 1) {
    return this.get("/trending/tv/week", { page });
  }

  discoverTv(genreId?: number, page = 1) {
    const extra: Record<string, string | number> = { page, sort_by: "popularity.desc", include_adult: "false" };
    if (genreId) extra.with_genres = genreId;
    return this.get("/discover/tv", extra);
  }

  async fetchGenres(media: string): Promise<[Record<number, string>, string]> {
    const cached = this.genreCache.get(media);
    if (cached && Date.now() - cached.at < GENRE_CACHE_TTL_MS) {
      return [cached.genres, "tmdb"];
    }
    const fallback = FALLBACK_GENRES[media] || GENRES;
    try {
      const payload = await this.get(GENRE_PATHS[media]);
      const list = (payload.genres as { id: number; name: string }[]) || [];
      if (!list.length) return [fallback, "local"];
      const genres = { ...fallback };
      for (const item of list) {
        if (!item?.id || !item.name) continue;
        genres[item.id] = fallback[item.id] || item.name[0].toUpperCase() + item.name.slice(1);
      }
      this.genreCache.set(media, { at: Date.now(), genres });
      return [genres, "tmdb"];
    } catch {
      return [fallback, "local"];
    }
  }
}
