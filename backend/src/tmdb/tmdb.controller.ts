import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { TmdbService } from "./tmdb.service";
import { MOVIE, TV } from "./tmdb.client";

@ApiTags("tmdb")
@Controller("api")
export class TmdbController {
  constructor(private readonly tmdb: TmdbService) {}

  @Get("menu")
  @ApiOperation({
    summary: "Menú de navegación",
    description: "Categorías y colecciones destacadas que alimentan el menú del frontend.",
  })
  @ApiOkResponse({ description: "Estructura de menú con colecciones y géneros." })
  menu() {
    return this.tmdb.buildMenu();
  }

  @Get("peliculas/:tmdbId/trailer")
  @ApiOperation({
    summary: "Trailer de una película",
    description: "Devuelve la clave del trailer de YouTube de una película, o `null` si no existe.",
  })
  @ApiParam({ name: "tmdbId", example: 155, description: "ID de la película en TMDB." })
  @ApiOkResponse({ description: "Trailer de la película." })
  @ApiResponse({ status: 502, description: "TMDB no respondió o la clave de API es inválida." })
  trailer(@Param("tmdbId", ParseIntPipe) tmdbId: number) {
    return this.tmdb.getTrailer(tmdbId);
  }

  @Get("peliculas/:tmdbId")
  @ApiOperation({
    summary: "Obtener o importar una película",
    description:
      "Si la película no está en la base local, se importa desde TMDB y se persiste; " +
      "si ya existe, solo se lee.",
  })
  @ApiParam({ name: "tmdbId", example: 155, description: "ID de la película en TMDB." })
  @ApiOkResponse({ description: "Datos de la película, recién importada o leída de la base." })
  @ApiResponse({ status: 502, description: "Error al consultar TMDB." })
  getPelicula(@Param("tmdbId", ParseIntPipe) tmdbId: number) {
    return this.tmdb.getOrImport(tmdbId);
  }

  @Get("buscar")
  @ApiOperation({
    summary: "Buscar títulos",
    description: "Búsqueda unificada de películas y series por texto libre.",
  })
  @ApiQuery({ name: "query", example: "godfather", description: "Texto a buscar." })
  @ApiOkResponse({ description: "Resultados de la búsqueda." })
  @ApiResponse({ status: 502, description: "Error al consultar TMDB." })
  buscar(@Query("query") query: string) {
    return this.tmdb.search(query || "");
  }

  @Get("populares")
  @ApiOperation({
    summary: "Populares",
    description: "Títulos populares, paginados.",
  })
  @ApiQuery({ name: "page", required: false, example: 1, description: "Página (base 1)." })
  @ApiOkResponse({ description: "Página de títulos populares." })
  @ApiResponse({ status: 502, description: "Error al consultar TMDB." })
  populares(@Query("page") page = "1") {
    return this.tmdb.populares(Number(page) || 1);
  }

  @Get("inicio")
  @ApiOperation({
    summary: "Home de películas",
    description: "Filas destacadas para la portada de películas.",
  })
  @ApiOkResponse({ description: "Filas de contenido destacado." })
  @ApiResponse({ status: 502, description: "Error al consultar TMDB." })
  inicio() {
    return this.tmdb.listHome();
  }

  @Get("personas")
  @ApiOperation({
    summary: "Personas populares",
    description: "Actores y directores destacados.",
  })
  @ApiOkResponse({ description: "Listado de personas." })
  @ApiResponse({ status: 502, description: "Error al consultar TMDB." })
  personas() {
    return this.tmdb.listPeople();
  }

  @Get("generos/peliculas")
  @ApiOperation({
    summary: "Géneros de películas",
    description: "Géneros de películas soportados por la navegación.",
  })
  @ApiOkResponse({ description: "Géneros de películas." })
  @ApiResponse({ status: 502, description: "Error al consultar TMDB." })
  generosPeliculas() {
    return this.tmdb.listGenres(MOVIE);
  }

  @Get("generos/series")
  @ApiOperation({
    summary: "Géneros de series",
    description: "Géneros de series soportados por la navegación.",
  })
  @ApiOkResponse({ description: "Géneros de series." })
  @ApiResponse({ status: 502, description: "Error al consultar TMDB." })
  generosSeries() {
    return this.tmdb.listGenres(TV);
  }

  @Get("generos/:genreId")
  @ApiOperation({
    summary: "Títulos por género (películas)",
    description: "Descubre películas de un género, paginadas.",
  })
  @ApiParam({ name: "genreId", example: 28, description: "ID del género en TMDB." })
  @ApiQuery({ name: "page", required: false, example: 1, description: "Página (base 1)." })
  @ApiOkResponse({ description: "Página de títulos del género." })
  @ApiResponse({ status: 502, description: "Error al consultar TMDB." })
  genero(@Param("genreId", ParseIntPipe) genreId: number, @Query("page") page = "1") {
    return this.tmdb.listGenre(genreId, Number(page) || 1);
  }

  @Get("colecciones/peliculas/:clave")
  @ApiOperation({
    summary: "Colección de películas",
    description: "Títulos de una colección predefinida (por ejemplo, las más votadas).",
  })
  @ApiParam({ name: "clave", example: "top_rated", description: "Clave interna de la colección." })
  @ApiQuery({ name: "page", required: false, example: 1, description: "Página (base 1)." })
  @ApiOkResponse({ description: "Página de títulos de la colección." })
  @ApiResponse({ status: 502, description: "Error al consultar TMDB." })
  coleccionPeliculas(@Param("clave") clave: string, @Query("page") page = "1") {
    return this.tmdb.listCollection(MOVIE, clave, Number(page) || 1);
  }

  @Get("series/inicio")
  @ApiOperation({
    summary: "Home de series",
    description: "Filas destacadas para la portada de series.",
  })
  @ApiOkResponse({ description: "Filas de series destacadas." })
  @ApiResponse({ status: 502, description: "Error al consultar TMDB." })
  seriesInicio() {
    return this.tmdb.listTvHome();
  }

  @Get("series/generos/:genreId")
  @ApiOperation({
    summary: "Series por género",
    description: "Descubre series de un género, paginadas.",
  })
  @ApiParam({ name: "genreId", example: 10765, description: "ID del género de series en TMDB." })
  @ApiQuery({ name: "page", required: false, example: 1, description: "Página (base 1)." })
  @ApiOkResponse({ description: "Página de series del género." })
  @ApiResponse({ status: 502, description: "Error al consultar TMDB." })
  serieGenero(@Param("genreId", ParseIntPipe) genreId: number, @Query("page") page = "1") {
    return this.tmdb.listGenre(genreId, Number(page) || 1, TV);
  }

  @Get("colecciones/series/:clave")
  @ApiOperation({
    summary: "Colección de series",
    description: "Títulos de una colección predefinida de series.",
  })
  @ApiParam({ name: "clave", example: "top_rated", description: "Clave interna de la colección." })
  @ApiQuery({ name: "page", required: false, example: 1, description: "Página (base 1)." })
  @ApiOkResponse({ description: "Página de series de la colección." })
  @ApiResponse({ status: 502, description: "Error al consultar TMDB." })
  coleccionSeries(@Param("clave") clave: string, @Query("page") page = "1") {
    return this.tmdb.listCollection(TV, clave, Number(page) || 1);
  }

  @Get("series/:tmdbId/trailer")
  @ApiOperation({
    summary: "Trailer de una serie",
    description: "Devuelve la clave del trailer de YouTube de una serie, o `null` si no existe.",
  })
  @ApiParam({ name: "tmdbId", example: 1399, description: "ID de la serie en TMDB." })
  @ApiOkResponse({ description: "Trailer de la serie." })
  @ApiResponse({ status: 502, description: "TMDB no respondió o la clave de API es inválida." })
  serieTrailer(@Param("tmdbId", ParseIntPipe) tmdbId: number) {
    return this.tmdb.getTrailer(tmdbId, TV);
  }

  @Get("series/:tmdbId")
  @ApiOperation({
    summary: "Obtener o importar una serie",
    description:
      "Si la serie no está en la base local, se importa desde TMDB y se persiste; " +
      "si ya existe, solo se lee.",
  })
  @ApiParam({ name: "tmdbId", example: 1399, description: "ID de la serie en TMDB." })
  @ApiOkResponse({ description: "Datos de la serie, recién importada o leída de la base." })
  @ApiResponse({ status: 502, description: "Error al consultar TMDB." })
  getSerie(@Param("tmdbId", ParseIntPipe) tmdbId: number) {
    return this.tmdb.getOrImport(tmdbId, TV);
  }
}