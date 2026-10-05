import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { User } from "@prisma/client";
import { CatalogService, ReplyDto, ReviewDto } from "./catalog.service";

@ApiTags("catalog")
@Controller("api/v1/catalog")
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @ApiOperation({
    summary: "Listar el catálogo",
    description: "Devuelve títulos con su promedio de puntuación y número de reseñas, ordenados por el criterio indicado.",
  })
  @ApiQuery({
    name: "orden",
    required: false,
    enum: ["comentadas", "valoradas"],
    description: "`comentadas` (por defecto) ordena por número de reseñas; `valoradas` por puntuación media.",
  })
  @ApiOkResponse({ description: "Catálogo ordenado." })
  list(@Query("orden") orden?: string) {
    const sort = orden === "valoradas" ? "valoradas" : "comentadas";
    return this.catalog.listCatalog(sort);
  }

  @Get("recientes")
  @ApiOperation({
    summary: "Reseñas recientes",
    description: "Últimas reseñas publicadas en el foro, con autor y título de la película o serie.",
  })
  @ApiOkResponse({ description: "Reseñas ordenadas por fecha de creación." })
  recientes() {
    return this.catalog.listRecentReviews();
  }

  @Post("thread/:reviewId/replies")
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth("bearer")
  @ApiOperation({
    summary: "Responder una reseña",
    description: "Crea una respuesta en el hilo de una reseña. Bloqueado si el usuario está baneado.",
  })
  @ApiParam({ name: "reviewId", example: 12, description: "ID interno de la reseña." })
  @ApiCreatedResponse({ description: "Respuesta creada." })
  @ApiUnauthorizedResponse({ description: "Token ausente, inválido o expirado." })
  @ApiForbiddenResponse({ description: "Usuario baneado." })
  addReply(
    @Param("reviewId", ParseIntPipe) reviewId: number,
    @Body() payload: ReplyDto,
    @Req() req: { user: User },
  ) {
    return this.catalog.addReply(reviewId, req.user, payload);
  }

  @Patch("thread/replies/:replyId")
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth("bearer")
  @ApiOperation({
    summary: "Editar una respuesta propia",
    description: "Solo el autor de la respuesta puede modificarla.",
  })
  @ApiParam({ name: "replyId", example: 5, description: "ID interno de la respuesta." })
  @ApiOkResponse({ description: "Respuesta actualizada." })
  @ApiUnauthorizedResponse({ description: "Token ausente, inválido o expirado." })
  @ApiForbiddenResponse({ description: "La respuesta pertenece a otro usuario." })
  updateReply(
    @Param("replyId", ParseIntPipe) replyId: number,
    @Body() payload: ReplyDto,
    @Req() req: { user: User },
  ) {
    return this.catalog.updateReply(replyId, req.user, payload);
  }

  @Delete("thread/replies/:replyId")
  @HttpCode(204)
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth("bearer")
  @ApiOperation({
    summary: "Eliminar una respuesta",
    description: "Solo el autor de la respuesta puede eliminarla.",
  })
  @ApiParam({ name: "replyId", example: 5, description: "ID interno de la respuesta." })
  @ApiNoContentResponse({ description: "Respuesta eliminada. Sin cuerpo de respuesta." })
  @ApiUnauthorizedResponse({ description: "Token ausente, inválido o expirado." })
  @ApiForbiddenResponse({ description: "La respuesta pertenece a otro usuario." })
  deleteReply(@Param("replyId", ParseIntPipe) replyId: number, @Req() req: { user: User }) {
    return this.catalog.deleteReply(replyId, req.user);
  }

  @Get(":itemId/reviews")
  @ApiOperation({
    summary: "Reseñas de un título",
    description: "Lista las reseñas de una película o serie concreta.",
  })
  @ApiParam({ name: "itemId", example: 155, description: "ID interno del título (no es el ID de TMDB)." })
  @ApiQuery({
    name: "media",
    required: false,
    enum: ["pelicula", "serie"],
    description: "Discrimina entre película y serie, ya que ambos comparten el espacio de IDs.",
  })
  @ApiOkResponse({ description: "Reseñas del título." })
  reviews(@Param("itemId", ParseIntPipe) itemId: number, @Query("media") media?: string) {
    return this.catalog.listReviews(itemId, media);
  }

  @Post(":itemId/reviews")
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth("bearer")
  @ApiOperation({
    summary: "Crear o actualizar mi reseña",
    description:
      "Upsert: si el usuario ya ha reseñado el título, se actualiza la existente en lugar de crear un duplicado.",
  })
  @ApiParam({ name: "itemId", example: 155, description: "ID interno del título." })
  @ApiQuery({ name: "media", required: false, enum: ["pelicula", "serie"], description: "Tipo de contenido." })
  @ApiCreatedResponse({ description: "Reseña creada o actualizada." })
  @ApiUnauthorizedResponse({ description: "Token ausente, inválido o expirado." })
  @ApiForbiddenResponse({ description: "Usuario baneado." })
  upsert(
    @Param("itemId", ParseIntPipe) itemId: number,
    @Body() payload: ReviewDto,
    @Req() req: { user: User },
    @Query("media") media?: string,
  ) {
    return this.catalog.upsertReview(itemId, req.user, payload, media);
  }

  @Delete(":itemId/reviews")
  @HttpCode(204)
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth("bearer")
  @ApiOperation({
    summary: "Eliminar mi reseña",
    description: "Elimina la reseña del usuario autenticado sobre el título indicado.",
  })
  @ApiParam({ name: "itemId", example: 155, description: "ID interno del título." })
  @ApiQuery({ name: "media", required: false, enum: ["pelicula", "serie"], description: "Tipo de contenido." })
  @ApiNoContentResponse({ description: "Reseña eliminada. Sin cuerpo de respuesta." })
  @ApiUnauthorizedResponse({ description: "Token ausente, inválido o expirado." })
  remove(
    @Param("itemId", ParseIntPipe) itemId: number,
    @Req() req: { user: User },
    @Query("media") media?: string,
  ) {
    return this.catalog.deleteReview(itemId, req.user, media);
  }
}