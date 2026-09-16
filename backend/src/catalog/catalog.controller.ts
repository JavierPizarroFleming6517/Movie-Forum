import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { User } from "@prisma/client";
import { CatalogService, ReviewDto } from "./catalog.service";

@Controller("api/v1/catalog")
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  list(@Query("orden") orden?: string) {
    const sort = orden === "valoradas" ? "valoradas" : "comentadas";
    return this.catalog.listCatalog(sort);
  }

  @Get("recientes")
  recientes() {
    return this.catalog.listRecentReviews();
  }

  @Get(":itemId/reviews")
  reviews(@Param("itemId", ParseIntPipe) itemId: number, @Query("media") media?: string) {
    return this.catalog.listReviews(itemId, media);
  }

  @Post(":itemId/reviews")
  @UseGuards(AuthGuard("jwt"))
  upsert(
    @Param("itemId", ParseIntPipe) itemId: number,
    @Body() payload: ReviewDto,
    @Req() req: { user: User },
    @Query("media") media?: string,
  ) {
    return this.catalog.upsertReview(itemId, req.user, payload, media);
  }
}
