import { NestFactory } from "@nestjs/core";
import { Logger, ValidationPipe } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true });
  app.use((req: Request, res: Response, next: NextFunction) => {
    const started = Date.now();
    res.on("finish", () => {
      Logger.log(`${req.method} ${req.originalUrl} ${res.statusCode} +${Date.now() - started}ms`, "HTTP");
    });
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  const port = Number(process.env.PORT || 3001);

  const config = new DocumentBuilder()
    .setTitle("Movie Forum API")
    .setDescription(
      "API REST de Movie Forum: autenticación JWT, catálogo de películas y series, " +
        "reseñas, respuestas, sistema de reportes y moderación, métricas administrativas " +
        "e integración con TMDB. La base de datos es PostgreSQL.",
    )
    .setVersion("1.0.0")
    .addBearerAuth(
      { type: "http", scheme: "bearer", bearerFormat: "JWT", description: "Token JWT obtenido en POST /api/v1/auth/login" },
      "bearer",
    )
    .addTag("status", "Estado del servicio y la base de datos")
    .addTag("auth", "Registro, login y perfil del usuario autenticado")
    .addTag("catalog", "Catálogo, reseñas y respuestas")
    .addTag("reports", "Reportes de contenido y moderación (requiere rol admin)")
    .addTag("metrics", "Métricas y analítica del panel de administración")
    .addTag("tmdb", "Catálogo externo de TMDB: búsqueda, discover y trailers")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port);
  console.log(`Movie Forum API http://127.0.0.1:${port}`);
  console.log(`Swagger UI      http://127.0.0.1:${port}/docs`);
}

bootstrap();
