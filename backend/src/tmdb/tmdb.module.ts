import { Module } from "@nestjs/common";
import { TmdbClient } from "./tmdb.client";
import { TmdbService } from "./tmdb.service";
import { TmdbController } from "./tmdb.controller";

@Module({
  controllers: [TmdbController],
  providers: [TmdbClient, TmdbService],
  exports: [TmdbService],
})
export class TmdbModule {}
