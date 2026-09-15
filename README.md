# Movie Forum (FOROPELIS)

Foro de reseñas de películas y series. Stack inscrito: **React + Vite + Tailwind**, **NestJS**, **PostgreSQL** y **TMDB**.

## Requisitos

- Node.js 20+
- Docker Desktop

## Cómo correr (oficial)

La API y Postgres van en Docker. El frontend se sirve en el host.

```powershell
cd Movie-Forum
copy backend\.env.example backend\.env
# Completa TMDB_API_KEY en backend\.env

docker compose up -d --build

cd frontend
npm install
npm run dev
```

Si la base está vacía (primera vez), crea las tablas:

```powershell
cd backend
npm install
npx prisma generate
npx prisma db push
```

- App: http://127.0.0.1:5173
- API: http://127.0.0.1:3001
- Estado: http://127.0.0.1:3001/api/status

No uses `prisma migrate` contra esta base: el esquema se aplica con `db push`.

## Desarrollo local de la API (opcional)

```powershell
docker compose up -d db
cd backend
npm run start:dev
```

## Tests y CI

```powershell
cd backend
npm test
npm run test:cov
```

El coverage del backend tiene umbral **60%**. GitHub Actions (`.github/workflows/ci.yml`) corre esos tests y compila el frontend en cada push/PR.

## Presentación

Material visual (temática, stack, diagramas): [docs/presentacion.md](docs/presentacion.md).
