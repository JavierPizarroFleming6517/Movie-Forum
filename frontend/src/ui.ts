export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const sectionTitleClass =
  "mx-2 my-5 flex items-center gap-2.5 text-[22px] font-bold before:block before:h-7 before:w-1.5 before:rounded-sm before:bg-accent-text before:content-['']";

export const ghostBtnClass =
  "inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent px-2.5 py-2 text-white hover:rounded-lg hover:bg-white/10";

export const fieldClass =
  "rounded-md border border-divider bg-surface px-3.5 py-3 text-white";

export const primaryBtnClass =
  "inline-flex cursor-pointer items-center justify-center rounded-3xl bg-accent-text px-[18px] py-3 font-semibold text-footer";

export const playBtnClass =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-3xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover";

export const shellClass = "mx-auto w-full max-w-[1280px] px-6";

export const pageClass = "min-w-0 pb-12 pt-6";

export const metaClass = "text-[13px] text-muted";

export function titleHref(id: number, media: "pelicula" | "serie" = "pelicula") {
  return media === "serie" ? `/serie/${id}` : `/pelicula/${id}`;
}

export const hoverLiftClass =
  "transition duration-200 ease-out hover:z-[1] hover:scale-[1.08] hover:shadow-[0_12px_28px_#000c]";
