import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  FALLBACK_GENRES,
  MOVIE,
  TV,
  TmdbClient,
  buildBackdropUrl,
  buildPosterUrl,
} from "./tmdb.client";

const TRAILER_LANGUAGES = ["es-ES", "en-US"] as const;
const YOUTUBE_WATCH = "https://www.youtube.com/watch?v=";
const MEDIA_TITLES: Record<string, string> = { [MOVIE]: "Películas", [TV]: "Series" };

type FetchPage = (page?: number) => Promise<Record<string, unknown>>;

const COLLECTIONS: Record<string, Record<string, { title: string; fetch: FetchPage }>> = {};

const HOME_ROWS = [
  { id: "popular", title: "Las 10 más populares", kind: "popular", limit: 10 },
  { id: "trending", title: "Tendencias de la semana", kind: "trending" },
  { id: "top_rated", title: "Mejor valoradas", kind: "top_rated" },
  { id: "now_playing", title: "En cartelera", kind: "now_playing" },
  { id: "upcoming", title: "Próximos estrenos", kind: "upcoming" },
  { id: "comedy", title: "Comedia", kind: "genre", genre_id: 35 },
  { id: "horror", title: "Terror", kind: "genre", genre_id: 27 },
  { id: "action", title: "Acción", kind: "genre", genre_id: 28 },
  { id: "drama", title: "Drama", kind: "genre", genre_id: 18 },
  { id: "scifi", title: "Ciencia ficción", kind: "genre", genre_id: 878 },
  { id: "romance", title: "Romance", kind: "genre", genre_id: 10749 },
  { id: "animation", title: "Animación", kind: "genre", genre_id: 16 },
  { id: "thriller", title: "Suspense", kind: "genre", genre_id: 53 },
];

const TV_HOME_ROWS = [
  { id: "tv_popular", title: "Series populares", collection: "populares", limit: 10 },
  { id: "tv_trending", title: "Series en tendencia", collection: "tendencias" },
  { id: "tv_on_the_air", title: "En emisión", collection: "en_emision" },
  { id: "tv_top_rated", title: "Series mejor valoradas", collection: "mejor_valoradas" },
  { id: "tv_drama", title: "Drama", genre_id: 18 },
  { id: "tv_comedy", title: "Comedia", genre_id: 35 },
  { id: "tv_action", title: "Acción y aventura", genre_id: 10759 },
  { id: "tv_scifi", title: "Ciencia ficción y fantasía", genre_id: 10765 },
  { id: "tv_crime", title: "Crimen", genre_id: 80 },
  { id: "tv_animation", title: "Animación", genre_id: 16 },
];

type TmdbItem = Record<string, any>;

@Injectable()
export class TmdbService {
  constructor(
    private readonly tmdb: TmdbClient,
    private readonly prisma: PrismaService,
  ) {
    COLLECTIONS[MOVIE] = {
      populares: { title: "Las más populares", fetch: (p) => this.tmdb.fetchPopularMovies(p) },
      tendencias: { title: "Tendencias de la semana", fetch: (p) => this.tmdb.fetchTrendingMovies(p) },
      mejor_valoradas: { title: "Mejor valoradas", fetch: (p) => this.tmdb.fetchTopRatedMovies(p) },
      cartelera: { title: "En cartelera", fetch: (p) => this.tmdb.fetchNowPlayingMovies(p) },
      proximos: { title: "Próximos estrenos", fetch: (p) => this.tmdb.fetchUpcomingMovies(p) },
    };
    COLLECTIONS[TV] = {
      populares: { title: "Series populares", fetch: (p) => this.tmdb.fetchPopularTv(p) },
      tendencias: { title: "Series en tendencia", fetch: (p) => this.tmdb.fetchTrendingTv(p) },
      mejor_valoradas: { title: "Series mejor valoradas", fetch: (p) => this.tmdb.fetchTopRatedTv(p) },
      en_emision: { title: "En emisión", fetch: (p) => this.tmdb.fetchOnTheAirTv(p) },
      hoy: { title: "Hoy en televisión", fetch: (p) => this.tmdb.fetchAiringTodayTv(p) },
    };
  }

  mapResults(payload: Record<string, unknown>) {
    const results = (payload.results as TmdbItem[]) || [];
    return results.map((item) => ({
      id: item.id,
      titulo: item.title || item.name || item.original_title || item.original_name || "Sin título",
      poster_url: buildPosterUrl(item.poster_path),
      backdrop_url: buildBackdropUrl(item.backdrop_path),
      fecha_estreno: item.release_date || item.first_air_date || null,
      sinopsis: item.overview || null,
      valoracion: item.vote_average ?? null,
      votos: item.vote_count ?? null,
      popularidad: item.popularity ?? null,
    }));
  }

  async search(query: string) {
    const payload = await this.tmdb.searchMovies(query);
    return { query, results: this.mapResults(payload) };
  }

  async populares(page = 1) {
    const payload = await this.tmdb.fetchPopularMovies(page);
    return { source: "popular", page, results: this.mapResults(payload) };
  }

  async listPeople() {
    const payload = await this.tmdb.fetchTrendingPeople();
    const results = ((payload.results as TmdbItem[]) || [])
      .filter((item) => item.known_for_department === "Acting" || !item.known_for_department)
      .slice(0, 16)
      .map((item) => ({
        id: item.id,
        nombre: item.name || "Sin nombre",
        foto_url: buildPosterUrl(item.profile_path),
        departamento: item.known_for_department || "Interpretación",
        obras: ((item.known_for as TmdbItem[]) || [])
          .slice(0, 2)
          .map((work) => work.title || work.name)
          .filter(Boolean),
      }));
    return { title: "Rostros de la semana", results };
  }

  private async fetchHomeKind(kind: string, genreId?: number) {
    if (kind === "popular") return this.tmdb.fetchPopularMovies();
    if (kind === "trending") return this.tmdb.fetchTrendingMovies();
    if (kind === "top_rated") return this.tmdb.fetchTopRatedMovies();
    if (kind === "now_playing") return this.tmdb.fetchNowPlayingMovies();
    if (kind === "upcoming") return this.tmdb.fetchUpcomingMovies();
    return this.tmdb.discoverMovies(genreId);
  }

  async listHome() {
    const payloads = await Promise.all(
      HOME_ROWS.map((spec) => this.fetchHomeKind(spec.kind, spec.genre_id).catch(() => null)),
    );
    const rows = [];
    for (let i = 0; i < HOME_ROWS.length; i++) {
      const spec = HOME_ROWS[i];
      const payload = payloads[i];
      if (!payload) continue;
      let results = this.mapResults(payload);
      if (spec.limit) results = results.slice(0, spec.limit);
      if (results.length) rows.push({ id: spec.id, title: spec.title, media: MOVIE, results });
    }
    return { rows };
  }

  async listTvHome() {
    const payloads = await Promise.all(
      TV_HOME_ROWS.map((spec) => {
        if (spec.collection) return COLLECTIONS[TV][spec.collection].fetch().catch(() => null);
        return this.tmdb.discoverTv(spec.genre_id).catch(() => null);
      }),
    );
    const rows = [];
    for (let i = 0; i < TV_HOME_ROWS.length; i++) {
      const spec = TV_HOME_ROWS[i];
      const payload = payloads[i];
      if (!payload) continue;
      let results = this.mapResults(payload);
      if (spec.limit) results = results.slice(0, spec.limit);
      if (results.length) rows.push({ id: spec.id, title: spec.title, media: TV, results });
    }
    return { rows };
  }

  async listGenre(genreId: number, page = 1, media = MOVIE) {
    if (!FALLBACK_GENRES[media]) {
      throw new HttpException("Tipo de contenido no disponible", HttpStatus.NOT_FOUND);
    }
    const [genres] = await this.tmdb.fetchGenres(media);
    const title = genres[genreId] || FALLBACK_GENRES[media][genreId];
    if (!title) throw new HttpException("Género no disponible", HttpStatus.NOT_FOUND);
    const payload = media === TV ? await this.tmdb.discoverTv(genreId, page) : await this.tmdb.discoverMovies(genreId, page);
    return { id: `${media}-${genreId}`, title, media, results: this.mapResults(payload) };
  }

  async listCollection(media: string, collection: string, page = 1) {
    const catalog = COLLECTIONS[media];
    if (!catalog) throw new HttpException("Tipo de contenido no disponible", HttpStatus.NOT_FOUND);
    const entry = catalog[collection];
    if (!entry) throw new HttpException("Colección no disponible", HttpStatus.NOT_FOUND);
    const payload = await entry.fetch(page);
    return { id: `${media}-${collection}`, title: entry.title, media, results: this.mapResults(payload) };
  }

  async listGenres(media: string) {
    if (!COLLECTIONS[media]) throw new HttpException("Tipo de contenido no disponible", HttpStatus.NOT_FOUND);
    const [genres, origen] = await this.tmdb.fetchGenres(media);
    return {
      media,
      origen,
      results: Object.entries(genres)
        .map(([id, nombre]) => ({ id: Number(id), nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    };
  }

  async buildMenu() {
    const medias = [MOVIE, TV] as const;
    const results = await Promise.all(medias.map((media) => this.tmdb.fetchGenres(media)));
    return {
      secciones: medias.map((media, index) => {
        const [genres, origen] = results[index];
        return {
          media,
          titulo: MEDIA_TITLES[media],
          origen,
          colecciones: Object.entries(COLLECTIONS[media]).map(([clave, value]) => ({
            clave,
            titulo: value.title,
          })),
          generos: Object.entries(genres)
            .map(([id, nombre]) => ({ id: Number(id), nombre }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
        };
      }),
    };
  }

  private pickVideo(videos: TmdbItem[]) {
    const youtube = videos.filter((v) => v.site === "YouTube" && v.key);
    for (const tipo of ["Trailer", "Teaser"]) {
      const ofType = youtube.filter((v) => v.type === tipo);
      const official = ofType.filter((v) => v.official);
      if (official[0]) return official[0];
      if (ofType[0]) return ofType[0];
    }
    return null;
  }

  async getTrailer(tmdbId: number, media = MOVIE) {
    const fetchVideos = media === TV ? this.tmdb.fetchTvVideos.bind(this.tmdb) : this.tmdb.fetchMovieVideos.bind(this.tmdb);
    for (const language of TRAILER_LANGUAGES) {
      try {
        const payload = await fetchVideos(tmdbId, language);
        const video = this.pickVideo((payload.results as TmdbItem[]) || []);
        if (!video) continue;
        return {
          tmdb_id: tmdbId,
          nombre: video.name || "Tráiler",
          clave: video.key,
          sitio: video.site || "YouTube",
          idioma: language,
          url: `${YOUTUBE_WATCH}${video.key}`,
          oficial: Boolean(video.official),
        };
      } catch {
        continue;
      }
    }
    throw new HttpException(
      media === TV ? "Esta serie no tiene tráiler disponible en TMDB" : "Esta película no tiene tráiler disponible en TMDB",
      HttpStatus.NOT_FOUND,
    );
  }

  private async statsByItem() {
    const rows = await this.prisma.review.groupBy({
      by: ["peliculaId"],
      _count: { id: true },
      _avg: { rating: true },
    });
    return new Map(rows.map((row) => [row.peliculaId, { count: row._count.id, avg: row._avg.rating }]));
  }

  toRead(
    item: { id: number; titulo: string; posterUrl: string | null; detallesExtra: Prisma.JsonValue },
    reviewCount = 0,
    averageRating: number | null = null,
  ) {
    return {
      id: item.id,
      titulo: item.titulo,
      poster_url: item.posterUrl,
      detalles_extra: item.detallesExtra || {},
      review_count: reviewCount,
      average_rating: averageRating != null ? Math.round(averageRating * 100) / 100 : null,
    };
  }

  async persistFromTmdb(payload: TmdbItem) {
    const tmdbId = Number(payload.id);
    const reserved = new Set(["id", "title", "original_title", "poster_path"]);
    const detallesExtra: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (!reserved.has(key)) detallesExtra[key] = value;
    }
    const titulo = payload.title || payload.original_title || "Sin título";
    const posterUrl = buildPosterUrl(payload.poster_path);
    return this.prisma.pelicula.upsert({
      where: { id: tmdbId },
      create: { id: tmdbId, titulo, posterUrl, detallesExtra: detallesExtra as Prisma.InputJsonValue },
      update: { titulo, posterUrl: posterUrl ?? undefined, detallesExtra: detallesExtra as Prisma.InputJsonValue },
    });
  }

  async getOrImport(tmdbId: number) {
    const existing = await this.prisma.pelicula.findUnique({ where: { id: tmdbId } });
    const extra = (existing?.detallesExtra as Record<string, unknown>) || {};
    const stats = await this.statsByItem();
    if (existing && extra.credits) {
      const stat = stats.get(existing.id);
      return this.toRead(existing, stat?.count || 0, stat?.avg ?? null);
    }
    const payload = await this.tmdb.fetchMovie(tmdbId);
    const pelicula = await this.persistFromTmdb(payload);
    const fresh = await this.statsByItem();
    const stat = fresh.get(pelicula.id);
    return this.toRead(pelicula, stat?.count || 0, stat?.avg ?? null);
  }
}
