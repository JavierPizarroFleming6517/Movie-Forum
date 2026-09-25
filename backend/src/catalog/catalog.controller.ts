import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { User } from "@prisma/client";
import { CatalogService, ReplyDto, ReviewDto } from "./catalog.service";

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

  @Post("thread/:reviewId/replies")
  @UseGuards(AuthGuard("jwt"))
  addReply(
    @Param("reviewId", ParseIntPipe) reviewId: number,
    @Body() payload: ReplyDto,
    @Req() req: { user: User },
  ) {
    return this.catalog.addReply(reviewId, req.user, payload);
  }

  @Patch("thread/replies/:replyId")
  @UseGuards(AuthGuard("jwt"))
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
  deleteReply(@Param("replyId", ParseIntPipe) replyId: number, @Req() req: { user: User }) {
    return this.catalog.deleteReply(replyId, req.user);
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

  @Delete(":itemId/reviews")
  @HttpCode(204)
  @UseGuards(AuthGuard("jwt"))
  remove(
    @Param("itemId", ParseIntPipe) itemId: number,
    @Req() req: { user: User },
    @Query("media") media?: string,
  ) {
    return this.catalog.deleteReview(itemId, req.user, media);
  }
}
