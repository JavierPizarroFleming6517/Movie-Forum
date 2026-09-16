export type RecentItem = {
  id: number;
  titulo: string;
  poster_url?: string | null;
  media: "pelicula" | "serie";
};

const KEY = "foropelis-recent";

export function listRecent(): RecentItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((item) => item?.id && item?.titulo) : [];
  } catch {
    return [];
  }
}

export function rememberRecent(item: RecentItem) {
  const next = [item, ...listRecent().filter((entry) => !(entry.id === item.id && entry.media === item.media))].slice(
    0,
    8,
  );
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function clearRecent() {
  localStorage.removeItem(KEY);
}
