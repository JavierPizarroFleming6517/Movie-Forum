export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

export type ReportType = "spam" | "offensive" | "spoiler" | "other";
export type ReportStatus = "pending" | "dismissed" | "action_taken";
export type TargetType = "review" | "reply";
export type ActionType = "warn" | "delete_content" | "ban_temp" | "ban_perm";

export interface Report {
  id: number;
  type: ReportType;
  reason: string;
  status: ReportStatus;
  targetId: number;
  targetType: TargetType;
  reporterId: number;
  reporter: { id: number; username: string };
  resolvedById?: number;
  resolvedBy?: { id: number; username: string };
  moderationActionId?: number;
  moderationAction?: ModerationAction;
  createdAt: string;
  resolvedAt?: string;
}

export interface ModerationAction {
  id: number;
  type: ActionType;
  targetId: number;
  targetType: TargetType;
  moderatorId: number;
  moderator: { id: number; username: string };
  reason?: string;
  durationDays?: number;
  expiresAt?: string;
  createdAt: string;
}

export interface ReportsResponse {
  data: Report[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateReportPayload {
  type: ReportType;
  reason: string;
}

export interface ResolveReportPayload {
  status: ReportStatus;
  moderationActionId?: number;
}

export interface CreateModerationActionPayload {
  type: ActionType;
  targetId: number;
  targetType: TargetType;
  reason?: string;
  durationDays?: number;
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
  people: () => request<any>("/api/personas"),
  recentReviews: () => request<any[]>("/api/v1/catalog/recientes"),
  genre: (id: number) => request<any>(`/api/generos/${id}`),
  tvGenre: (id: number) => request<any>(`/api/series/generos/${id}`),
  collection: (media: "pelicula" | "serie", key: string) =>
    request<any>(`/api/colecciones/${media === "serie" ? "series" : "peliculas"}/${key}`),
  search: (query: string) => request<any>(`/api/buscar?query=${encodeURIComponent(query)}`),
  catalog: (orden: "comentadas" | "valoradas" = "comentadas") =>
    request<any[]>(`/api/v1/catalog?orden=${orden}`),
  movie: (id: number) => request<any>(`/api/peliculas/${id}`),
  show: (id: number) => request<any>(`/api/series/${id}`),
  trailer: (id: number, media: "pelicula" | "serie" = "pelicula") =>
    request<any>(`/api/${media === "serie" ? "series" : "peliculas"}/${id}/trailer`),
  reviews: (id: number, media: "pelicula" | "serie" = "pelicula") =>
    request<any[]>(`/api/v1/catalog/${id}/reviews${media === "serie" ? "?media=serie" : ""}`),
  upsertReview: (id: number, rating: number, comment: string, media: "pelicula" | "serie" = "pelicula") =>
    request<any>(`/api/v1/catalog/${id}/reviews${media === "serie" ? "?media=serie" : ""}`, {
      method: "POST",
      body: JSON.stringify({ rating, comment }),
    }),
  deleteReview: (id: number, media: "pelicula" | "serie" = "pelicula") =>
    request<void>(`/api/v1/catalog/${id}/reviews${media === "serie" ? "?media=serie" : ""}`, { method: "DELETE" }),
  addReply: (reviewId: number, comment: string) =>
    request<any>(`/api/v1/catalog/thread/${reviewId}/replies`, {
      method: "POST",
      body: JSON.stringify({ comment }),
    }),
  updateReply: (replyId: number, comment: string) =>
    request<any>(`/api/v1/catalog/thread/replies/${replyId}`, {
      method: "PATCH",
      body: JSON.stringify({ comment }),
    }),
  deleteReply: (replyId: number) => request<void>(`/api/v1/catalog/thread/replies/${replyId}`, { method: "DELETE" }),
  login: (username: string, password: string) =>
    request<any>("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  register: (email: string, username: string, password: string) =>
    request<any>("/api/v1/auth/register", { method: "POST", body: JSON.stringify({ email, username, password }) }),
  metrics: () => request<any>("/api/v1/metrics"),
  me: () => request<any>("/api/v1/auth/me"),
  myReviews: () => request<any[]>("/api/v1/auth/reviews"),
  reportReview: (id: number, payload: CreateReportPayload) =>
    request<Report>(`/api/v1/reviews/${id}/report`, { method: "POST", body: JSON.stringify(payload) }),
  reportReply: (id: number, payload: CreateReportPayload) =>
    request<Report>(`/api/v1/replies/${id}/report`, { method: "POST", body: JSON.stringify(payload) }),
  getReports: (params?: { status?: ReportStatus; type?: ReportType; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.type) qs.set("type", params.type);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    return request<ReportsResponse>(`/api/v1/admin/reports?${qs.toString()}`);
  },
  resolveReport: (id: number, payload: ResolveReportPayload) =>
    request<Report>(`/api/v1/admin/reports/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  createModerationAction: (payload: CreateModerationActionPayload) =>
    request<ModerationAction>("/api/v1/admin/moderation-actions", { method: "POST", body: JSON.stringify(payload) }),
};
