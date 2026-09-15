export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

function token(): string | null {
  return localStorage.getItem("token");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const jwt = token();
  if (jwt) headers.set("Authorization", `Bearer ${jwt}`);
  const response = await fetch(path, { ...init, headers });
  if (!response.ok) {
    let detail = `Error HTTP ${response.status}`;
    try {
      const data = await response.json();
      const raw = data.message || data.detail || data;
      detail = Array.isArray(raw) ? raw.map((item) => item.message || item).join("; ") : String(raw);
    } catch {
      /* keep default */
    }
    throw new ApiError(detail, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export const api = {
  menu: () => request<any>("/api/menu"),
  home: () => request<any>("/api/inicio"),
  tvHome: () => request<any>("/api/series/inicio"),
  genre: (id: number) => request<any>(`/api/generos/${id}`),
  tvGenre: (id: number) => request<any>(`/api/series/generos/${id}`),
  collection: (media: "pelicula" | "serie", key: string) =>
    request<any>(`/api/colecciones/${media === "serie" ? "series" : "peliculas"}/${key}`),
  search: (query: string) => request<any>(`/api/buscar?query=${encodeURIComponent(query)}`),
  catalog: (orden: "comentadas" | "valoradas" = "comentadas") =>
    request<any[]>(`/api/v1/catalog?orden=${orden}`),
  movie: (id: number) => request<any>(`/api/peliculas/${id}`),
  trailer: (id: number, media: "pelicula" | "serie" = "pelicula") =>
    request<any>(`/api/${media === "serie" ? "series" : "peliculas"}/${id}/trailer`),
  reviews: (id: number) => request<any[]>(`/api/v1/catalog/${id}/reviews`),
  upsertReview: (id: number, rating: number, comment: string) =>
    request<any>(`/api/v1/catalog/${id}/reviews`, {
      method: "POST",
      body: JSON.stringify({ rating, comment }),
    }),
  login: (username: string, password: string) =>
    request<any>("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  register: (email: string, username: string, password: string) =>
    request<any>("/api/v1/auth/register", { method: "POST", body: JSON.stringify({ email, username, password }) }),
  metrics: () => request<any>("/api/v1/metrics"),
  me: () => request<any>("/api/v1/auth/me"),
  myReviews: () => request<any[]>("/api/v1/auth/reviews"),
};
