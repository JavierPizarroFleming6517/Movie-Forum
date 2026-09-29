import { Module } from "@nestjs/common";
import { CatalogService } from "./catalog.service";
import { CatalogController } from "./catalog.controller";
import { TmdbModule } from "../tmdb/tmdb.module";
import { ReportsModule } from "../reports/reports.module";

@Module({
  imports: [TmdbModule, ReportsModule],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
