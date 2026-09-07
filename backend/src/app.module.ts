import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { CatalogModule } from "./catalog/catalog.module";
import { TmdbModule } from "./tmdb/tmdb.module";
import { MetricsModule } from "./metrics/metrics.module";
import { StatusModule } from "./status/status.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ".env" }),
    PrismaModule,
    AuthModule,
    CatalogModule,
    TmdbModule,
    MetricsModule,
    StatusModule,
  ],
})
export class AppModule {}
