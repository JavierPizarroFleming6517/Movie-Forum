import { useEffect, useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { BrowseLayout } from "../components/BrowseLayout";
import { LoadingScreen } from "../components/LoadingScreen";
import { PosterRow } from "../components/PosterRow";
import { pageClass } from "../ui";

const COMMUNITY: Record<string, [string, string]> = {
  comentadas: ["Las más comentadas", "Películas con más reseñas de la comunidad"],
  valoradas: ["Mejor valoradas por la comunidad", "Según la nota media de las reseñas"],
};

function communityCards(items: any[]) {
  return items.map((item) => ({
    id: item.id,
    titulo: item.titulo,
    poster_url: item.poster_url,
    valoracion: item.average_rating,
    average_rating: item.average_rating,
    review_count: item.review_count,
    sinopsis: item.detalles_extra?.overview || null,
    fecha_estreno: item.detalles_extra?.release_date || null,
  }));
}

export function CatalogPage() {
  const { collection, genreId, kind } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}`;
  const [heading, setHeading] = useState("Explora el contenido");
  const [sub, setSub] = useState("Populares, cartelera, estrenos y categorías");
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [readyKey, setReadyKey] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError("");
      function finish(next: any[]) {
        setRows(next);
        setReadyKey(routeKey);
      }
      try {
        if (location.pathname.startsWith("/buscar")) {
          const q = params.get("q") || "";
          setHeading(`Resultados para "${q}"`);
          setSub("Búsqueda en películas de TMDB");
          const data = await api.search(q);
          if (!cancelled) finish([{ title: `Resultados para "${q}"`, results: data.results || [], media: "pelicula" }]);
          return;
        }
        if (location.pathname.startsWith("/foro/") && kind) {
          const [title, subtitle] = COMMUNITY[kind] || COMMUNITY.comentadas;
          setHeading(title);
          setSub(subtitle);
          const items = await api.catalog(kind === "valoradas" ? "valoradas" : "comentadas");
          if (!cancelled) finish([{ title, results: communityCards(items), media: "pelicula" }]);
          return;
        }
        if (location.pathname.startsWith("/series/genero/") && genreId) {
          const data = await api.tvGenre(Number(genreId));
          setHeading(data.title || params.get("nombre") || "Género");
          setSub("Series por género");
          if (!cancelled) finish([{ ...data, media: "serie" }]);
          return;
        }
        if (location.pathname.startsWith("/genero/") && genreId) {
          const data = await api.genre(Number(genreId));
          setHeading(data.title || params.get("nombre") || "Género");
          setSub("Películas por categoría");
          if (!cancelled) finish([data]);
          return;
        }
        if (location.pathname.startsWith("/series/") && collection) {
          const data = await api.collection("serie", collection);
          setHeading(data.title || collection);
          setSub("Series");
          if (!cancelled) finish([{ ...data, media: "serie" }]);
          return;
        }
        if (location.pathname.startsWith("/peliculas/") && collection) {
          const data = await api.collection("pelicula", collection);
          setHeading(data.title || collection);
          setSub("Películas");
          if (!cancelled) finish([data]);
          return;
        }
        if (location.pathname === "/series") {
          setHeading("Series y televisión");
          setSub("Populares, en emisión y géneros de TV");
          const data = await api.tvHome();
          if (!cancelled) finish(data.rows || []);
          return;
        }
        setHeading("Esta sección no está disponible");
        setSub("Vuelve al inicio o elige una colección, un género o un tema del foro");
        if (!cancelled) finish([]);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "No se pudo cargar el catálogo");
          setReadyKey(routeKey);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search, collection, genreId, kind, params, routeKey]);

  if (readyKey !== routeKey) return <LoadingScreen />;

  const single = rows.length === 1 ? rows[0] : null;

  return (
    <div className={pageClass}>
      {error && <p className="mb-6 text-[#ff8a80]">{error}</p>}
      {single ? (
        <BrowseLayout
          heading={heading}
          sub={sub}
          items={single.results || []}
          media={single.media === "serie" ? "serie" : "pelicula"}
        />
      ) : (
        <>
          <h1 className="mb-1 text-[30px]">{heading}</h1>
          <p className="mb-6 text-[13px] text-muted">{sub}</p>
          {rows.map((row) => (
            <PosterRow
              key={row.id || row.title}
              title={row.title || "Catálogo"}
              items={row.results || []}
              media={row.media === "serie" ? "serie" : "pelicula"}
            />
          ))}
        </>
      )}
    </div>
  );
}
