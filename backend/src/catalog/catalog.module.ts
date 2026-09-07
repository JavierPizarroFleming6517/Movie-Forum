import { Module } from "@nestjs/common";
import { CatalogService } from "./catalog.service";
import { CatalogController } from "./catalog.controller";
import { TmdbModule } from "../tmdb/tmdb.module";

@Module({
  imports: [TmdbModule],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
