import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();
const API = process.env.API_URL || "http://127.0.0.1:3001";

const DEMO_USERS = [
  { username: "luna", email: "luna@foropelis.test" },
  { username: "marco", email: "marco@foropelis.test" },
  { username: "sofia", email: "sofia@foropelis.test" },
  { username: "nico", email: "nico@foropelis.test" },
  { username: "valentina", email: "valentina@foropelis.test" },
  { username: "andres", email: "andres@foropelis.test" },
  { username: "camila", email: "camila@foropelis.test" },
  { username: "diego", email: "diego@foropelis.test" },
  { username: "irene", email: "irene@foropelis.test" },
  { username: "pablo", email: "pablo@foropelis.test" },
  { username: "marina", email: "marina@foropelis.test" },
  { username: "hugo", email: "hugo@foropelis.test" },
  { username: "clara", email: "clara@foropelis.test" },
  { username: "tomas", email: "tomas@foropelis.test" },
];

const COMMENTS = [
  "Me enganchó desde el primer acto. El ritmo y los personajes están muy bien resueltos.",
  "Visualmente es un lujo. Alguna subtrama se alarga, pero vale la pena.",
  "La vi otra vez y encontré detalles que se me habían pasado. Muy rewatchable.",
  "El final me dejó pensando días. No es perfecta, pero sí memorable.",
  "Buena cinta para el fin de semana. Entretenida, sin pretender más de la cuenta.",
  "El elenco está en un gran momento. La química se nota en cada escena.",
  "Esperaba otra cosa y me sorprendió para bien. La recomiendo sin dudar.",
  "Tiene un par de agujeros, pero la atmósfera compensa. Me gustó bastante.",
  "Soundtrack y fotografía de primer nivel. De las que se quedan en la cabeza.",
  "No es para todo el mundo, pero si te gusta el género, encaja perfecto.",
  "Sólida. No revoluciona nada y aun así se ve con ganas hasta el crédito final.",
  "Me hizo reír y también me apretó el pecho. Equilibrio difícil, y aquí funciona.",
];

type CatalogItem = { id: number; titulo: string; poster_url?: string | null };

function pick<T>(items: T[], index: number) {
  return items[Math.abs(index) % items.length];
}

function ratingFor(movieIndex: number, reviewIndex: number) {
  return 2 + ((movieIndex * 3 + reviewIndex * 7) % 4);
}

async function readJson(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  return response.json();
}

function collect(items: CatalogItem[], bag: Map<number, CatalogItem>) {
  for (const item of items) {
    if (!item?.id || !item?.titulo) continue;
    bag.set(item.id, item);
  }
}

async function loadMovies(): Promise<CatalogItem[]> {
  const bag = new Map<number, CatalogItem>();
  const urls = [
    `${API}/api/inicio`,
    `${API}/api/colecciones/peliculas/populares`,
    `${API}/api/colecciones/peliculas/mejor_valoradas`,
    `${API}/api/colecciones/peliculas/tendencias`,
    `${API}/api/colecciones/peliculas/cartelera`,
  ];
  for (const url of urls) {
    const data = await readJson(url);
    if (Array.isArray(data.rows)) {
      for (const row of data.rows) collect(row.results || [], bag);
    }
    collect(data.results || [], bag);
  }
  return [...bag.values()].slice(0, 40);
}

async function main() {
  const movies = await loadMovies();
  if (movies.length < 8) {
    throw new Error("No se pudieron leer películas de la API. ¿Está corriendo en :3001?");
  }

  const password = await bcrypt.hash("foro1234", 10);
  const users = [];

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      email: "admin@foropelis.test",
      username: "admin",
      hashedPassword: password,
      isActive: true,
      role: "admin",
    },
  });
  users.push(admin);

  for (const demo of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { username: demo.username },
      update: {},
      create: {
        email: demo.email,
        username: demo.username,
        hashedPassword: password,
        isActive: true,
        role: "user",
      },
    });
    users.push(user);
  }

  for (const movie of movies) {
    await prisma.pelicula.upsert({
      where: { id: movie.id },
      create: {
        id: movie.id,
        titulo: movie.titulo,
        posterUrl: movie.poster_url || null,
        detallesExtra: {},
      },
      update: {
        titulo: movie.titulo,
        posterUrl: movie.poster_url || undefined,
      },
    });
  }

  let reviews = 0;
  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    const count = 4 + (i % 5);
    for (let k = 0; k < count; k++) {
      const user = pick(users, i + k * 3);
      await prisma.review.upsert({
        where: { userId_peliculaId: { userId: user.id, peliculaId: movie.id } },
        create: {
          userId: user.id,
          peliculaId: movie.id,
          rating: ratingFor(i, k),
          comment: pick(COMMENTS, i * 5 + k),
        },
        update: {
          rating: ratingFor(i, k),
          comment: pick(COMMENTS, i * 5 + k),
        },
      });
      reviews += 1;
    }
  }

  const [userCount, titleCount, reviewCount] = await Promise.all([
    prisma.user.count(),
    prisma.pelicula.count(),
    prisma.review.count(),
  ]);
  console.log(
    `Seed listo: ${users.length} cuentas demo, ${movies.length} películas, ${reviews} reseñas escritas.`,
  );
  console.log(`Totales en la base: ${userCount} usuarios, ${titleCount} títulos, ${reviewCount} reseñas.`);
  console.log("Contraseña de las cuentas demo: foro1234");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
