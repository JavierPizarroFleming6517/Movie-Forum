# FOROPELIS — material de presentación

Apoyo visual para explicar temática, solución y arquitectura. No es el código: es el relato de la entrega.

## 1. Temática

FOROPELIS es un foro de cine y series. El usuario explora el catálogo (TMDB), abre una ficha y deja una reseña con puntaje. La comunidad ve las más comentadas y las mejor valoradas; las métricas de actividad quedan para el administrador.

Problema: el catálogo cambia todo el tiempo y no tiene sentido copiar TMDB entero. Solución: TMDB es la fuente del listado; Postgres solo guarda lo que el foro necesita (cuentas, copias de fichas visitadas y reseñas).

## 2. Stack inscrito

| Capa | Tecnología | Rol |
| --- | --- | --- |
| Frontend | React 19 + Vite 7 + Tailwind 4 | UI, rutas, proxy `/api` |
| Backend | NestJS 11 + Prisma + JWT | Auth, catálogo local, proxy TMDB |
| Base | PostgreSQL 16 (Docker) | `users`, `peliculas`, `reviews` |
| Externa | TMDB API | Búsqueda, home, géneros, tráilers |

## 3. Arquitectura

```mermaid
flowchart LR
  browser[Navegador]
  vite[React_Vite]
  nest[NestJS_API]
  pg[(Postgres)]
  tmdb[TMDB]

  browser --> vite
  vite -->|"/api proxy"| nest
  nest --> pg
  nest --> tmdb
```

- El frontend no habla con TMDB. Todo pasa por Nest.
- Compose levanta `db` + `api`. Vite queda en el host (`npm run dev`).

## 4. Modelo de datos

```mermaid
erDiagram
  users ||--o{ reviews : escribe
  peliculas ||--o{ reviews : recibe
  users {
    int id PK
    string email
    string username
    string hashed_password
    string role
  }
  peliculas {
    int id PK
    string titulo
    string poster_url
    json detalles_extra
  }
  reviews {
    int id PK
    int user_id FK
    int pelicula_id FK
    int rating
    string comment
  }
```

- `peliculas.id` es el id de TMDB, no un id interno.
- Una reseña por usuario y película (`uq_review_user_item`).
- `peliculas` no es el catálogo completo: es caché + ancla de FK.

## 5. Flujo de una ficha

```mermaid
sequenceDiagram
  participant UI as React
  participant API as Nest
  participant DB as Postgres
  participant TMDB as TMDB

  UI->>API: GET /api/peliculas/id
  API->>DB: buscar pelicula
  alt ya tiene credits
    DB-->>API: fila local
  else primera visita
    API->>TMDB: fetch movie
    API->>DB: upsert pelicula
  end
  UI->>API: GET /api/v1/catalog/id/reviews
  API->>DB: reviews o lista vacia
  UI->>API: POST review (JWT)
  API->>DB: upsert review
```

El listado (home, tendencias, búsqueda) no escribe en Postgres. La película entra a la base **cuando alguien abre la ficha**.

## 6. Cómo se corre y cómo se valida

1. `docker compose up -d --build` → API en `:3001` y Postgres en `:5432`.
2. `cd frontend && npm run dev` → UI en `:5173`.
3. CI (GitHub Actions): `npm run test:cov` en backend (falla si el coverage baja de 60%) y `npm run build` en frontend.

## 7. Demo sugerida (5 minutos)

1. Home y una fila del catálogo.
2. Abrir una ficha nueva (primera importación) y recargar.
3. Registrarse / iniciar sesión.
4. Escribir una reseña y verla en la ficha.
5. Más comentadas (y métricas si entras como administrador).
6. Mostrar `docker compose ps` y el badge/log de CI.
