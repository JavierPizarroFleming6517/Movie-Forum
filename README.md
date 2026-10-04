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

Si la base está vacía (primera vez), crea las tablas y carga los datos de prueba:

```powershell
docker compose up -d --build
docker exec -u root movie-forum-api npx prisma db push --schema=prisma/schema.prisma --skip-generate
docker exec -u root movie-forum-api npm run prisma:seed
```

> Aplica el esquema **desde el contenedor**. Si en tu equipo hay otro PostgreSQL
> escuchando en el puerto 5432, el `npx prisma db push` desde el host puede
> conectarse al servidor equivocado.

- App: http://127.0.0.1:5173
- API: http://127.0.0.1:3001
- Estado: http://127.0.0.1:3001/api/status

No uses `prisma migrate` contra esta base: el esquema se aplica con `db push`.

Al registrarse, la cuenta nace con rol `user`. El seed crea un administrador:
`admin` / `foro1234` (y 14 usuarios demo con la misma contraseña). Solo `admin`
ve `/metricas`, que incluye el panel de moderación.

> El seed se ejecuta con `node prisma/run-seed.js`, que usa el JS ya compilado
> cuando existe y recurre a `ts-node` en desarrollo. La imagen de producción no
> incluye `ts-node` porque `npm prune --omit=dev` elimina las devDependencies.

## Moderación

Los usuarios pueden reportar reseñas y respuestas ajenas. En `/metricas`, el admin
descarta el reporte o aplica una acción:

| Acción | Efecto |
| --- | --- |
| Advertencia | Registra la acción en el historial |
| Eliminar contenido | Borra la reseña (y sus respuestas por cascada) o la respuesta |
| Ban temporal | El **autor** no puede publicar ni responder durante los días indicados |
| Ban permanente | El **autor** queda sancionado de forma indefinida |

El ban se aplica al autor del contenido, no a quien reportó. Un ban expira solo:
la cuenta puede seguir iniciando sesión. La acción y el cierre de los reportes
afectados ocurren en una sola transacción.

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

El coverage del backend tiene umbral **60%** (hoy ~97%). GitHub Actions
(`.github/workflows/ci.yml`) corre esos tests, compila el frontend y verifica que
la imagen del backend se pueda construir en cada push/PR.

## Presentación

Material visual (temática, stack, diagramas): [docs/presentacion.md](docs/presentacion.md).
