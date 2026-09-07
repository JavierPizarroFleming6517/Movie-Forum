import { useEffect, useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
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
  }));
}

export function CatalogPage() {
  const { collection, genreId, kind } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const [heading, setHeading] = useState("Explora el contenido");
  const [sub, setSub] = useState("Populares, cartelera, estrenos y categorías");
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError("");
      try {
        if (location.pathname.startsWith("/buscar")) {
          const q = params.get("q") || "";
          setHeading(`Resultados para "${q}"`);
          setSub("Búsqueda en el catálogo de TMDB");
          const data = await api.search(q);
          if (!cancelled) setRows([{ title: `Resultados para "${q}"`, results: data.results || [], media: "pelicula" }]);
          return;
        }
        if (location.pathname.startsWith("/foro/") && kind) {
          const [title, subtitle] = COMMUNITY[kind] || COMMUNITY.comentadas;
          setHeading(title);
          setSub(subtitle);
          const items = await api.catalog(kind === "valoradas" ? "valoradas" : "comentadas");
          if (!cancelled) setRows([{ title, results: communityCards(items), media: "pelicula" }]);
          return;
        }
        if (location.pathname.startsWith("/series/genero/") && genreId) {
          const data = await api.tvGenre(Number(genreId));
          setHeading(data.title || params.get("nombre") || "Género");
          setSub("Series por género de TV");
          if (!cancelled) setRows([{ ...data, media: "serie" }]);
          return;
        }
        if (location.pathname.startsWith("/genero/") && genreId) {
          const data = await api.genre(Number(genreId));
          setHeading(data.title || params.get("nombre") || "Género");
          setSub("Películas por categoría");
          if (!cancelled) setRows([data]);
          return;
        }
        if (location.pathname.startsWith("/series/") && collection) {
          const data = await api.collection("serie", collection);
          setHeading(data.title || collection);
          setSub("Series");
          if (!cancelled) setRows([{ ...data, media: "serie" }]);
          return;
        }
        if (location.pathname.startsWith("/peliculas/") && collection) {
          const data = await api.collection("pelicula", collection);
          setHeading(data.title || collection);
          setSub("Películas");
          if (!cancelled) setRows([data]);
          return;
        }
        if (location.pathname === "/series") {
          setHeading("Series y televisión");
          setSub("Populares, en emisión y géneros de TV");
          const data = await api.tvHome();
          if (!cancelled) setRows(data.rows || []);
          return;
        }
        setHeading("Explora el contenido");
        setSub("Populares, cartelera, estrenos y categorías");
        const [home, community] = await Promise.all([api.home(), api.catalog()]);
        const next = [...(home.rows || [])];
        if (community.length) {
          const comentadas = [...community].sort(
            (a, b) => (b.review_count || 0) - (a.review_count || 0),
          );
          const valoradas = [...community].sort(
            (a, b) => (b.average_rating || 0) - (a.average_rating || 0) || (b.review_count || 0) - (a.review_count || 0),
          );
          next.splice(1, 0, { title: "Las más comentadas", results: communityCards(comentadas).slice(0, 20) });
          next.splice(2, 0, {
            title: "Mejor valoradas por la comunidad",
            results: communityCards(valoradas).slice(0, 20),
          });
        }
        if (!cancelled) setRows(next);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "No se pudo cargar el catálogo");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search, collection, genreId, kind, params]);

  return (
    <div className={pageClass}>
      <h1 className="mb-1 text-[30px]">{heading}</h1>
      <p className="mb-6 text-[13px] text-muted">{sub}</p>
      {error && <p className="text-[#ff8a80]">{error}</p>}
      {rows.map((row) => (
        <PosterRow
          key={row.id || row.title}
          title={row.title || "Catálogo"}
          items={row.results || []}
          media={row.media === "serie" ? "serie" : "pelicula"}
        />
      ))}
    </div>
  );
}
