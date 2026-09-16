import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { TmdbService } from "./tmdb.service";
import { MOVIE, TV } from "./tmdb.client";

@Controller("api")
export class TmdbController {
  constructor(private readonly tmdb: TmdbService) {}

  @Get("menu")
  menu() {
    return this.tmdb.buildMenu();
  }

  @Get("peliculas/:tmdbId/trailer")
  trailer(@Param("tmdbId", ParseIntPipe) tmdbId: number) {
    return this.tmdb.getTrailer(tmdbId);
  }

  @Get("peliculas/:tmdbId")
  getPelicula(@Param("tmdbId", ParseIntPipe) tmdbId: number) {
    return this.tmdb.getOrImport(tmdbId);
  }

  @Get("buscar")
  buscar(@Query("query") query: string) {
    return this.tmdb.search(query || "");
  }

  @Get("populares")
  populares(@Query("page") page = "1") {
    return this.tmdb.populares(Number(page) || 1);
  }

  @Get("inicio")
  inicio() {
    return this.tmdb.listHome();
  }

  @Get("personas")
  personas() {
    return this.tmdb.listPeople();
  }

  @Get("generos/peliculas")
  generosPeliculas() {
    return this.tmdb.listGenres(MOVIE);
  }

  @Get("generos/series")
  generosSeries() {
    return this.tmdb.listGenres(TV);
  }

  @Get("generos/:genreId")
  genero(@Param("genreId", ParseIntPipe) genreId: number, @Query("page") page = "1") {
    return this.tmdb.listGenre(genreId, Number(page) || 1);
  }

  @Get("colecciones/peliculas/:clave")
  coleccionPeliculas(@Param("clave") clave: string, @Query("page") page = "1") {
    return this.tmdb.listCollection(MOVIE, clave, Number(page) || 1);
  }

  @Get("series/inicio")
  seriesInicio() {
    return this.tmdb.listTvHome();
  }

  @Get("series/generos/:genreId")
  serieGenero(@Param("genreId", ParseIntPipe) genreId: number, @Query("page") page = "1") {
    return this.tmdb.listGenre(genreId, Number(page) || 1, TV);
  }

  @Get("colecciones/series/:clave")
  coleccionSeries(@Param("clave") clave: string, @Query("page") page = "1") {
    return this.tmdb.listCollection(TV, clave, Number(page) || 1);
  }

  @Get("series/:tmdbId/trailer")
  serieTrailer(@Param("tmdbId", ParseIntPipe) tmdbId: number) {
    return this.tmdb.getTrailer(tmdbId, TV);
  }
}
