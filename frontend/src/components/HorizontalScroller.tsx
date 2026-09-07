import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../ui";

const arrowClass =
  "absolute top-[42%] z-[2] flex h-10 w-10 shrink-0 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-arrow text-white hover:enabled:bg-header/90 disabled:cursor-default disabled:opacity-30";

export function HorizontalScroller({
  children,
  itemWidth = 226,
  ariaLabel = "Desplazar fila",
}: {
  children: ReactNode;
  itemWidth?: number;
  ariaLabel?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const items = Children.toArray(children);
  const [start, setStart] = useState(0);
  const [full, setFull] = useState(4);

  useEffect(() => {
    const node = host.current;
    if (!node) return;

    function measure() {
      const width = track.current?.clientWidth ?? 0;
      if (!width) return;
      const nextFull = Math.max(1, Math.floor(width / itemWidth));
      setFull(nextFull);
      setStart((s) => Math.min(s, Math.max(0, items.length - nextFull)));
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [itemWidth, items.length]);

  const hasMore = start + full < items.length;
  const count = hasMore ? full + 1 : Math.min(full, items.length - start);
  const shown = items.slice(start, start + count);
  const canBack = start > 0;
  const canFwd = hasMore;

  return (
    <div
      className="relative mx-2 box-border flex max-w-[calc(100%-16px)] min-w-0 items-center justify-start overflow-visible pr-[52px]"
      ref={host}
    >
      <button
        type="button"
        className={cn(arrowClass, "-left-[52px]")}
        aria-label={`${ariaLabel}: anteriores`}
        disabled={!canBack}
        onClick={() => setStart((s) => Math.max(0, s - full))}
      >
        <Chevron dir="left" />
      </button>
      <div className="flex min-w-0 flex-1 gap-4 overflow-hidden py-4 pb-7" ref={track}>
        {shown}
      </div>
      <button
        type="button"
        className={cn(arrowClass, "right-0")}
        aria-label={`${ariaLabel}: siguientes`}
        disabled={!canFwd}
        onClick={() => setStart((s) => Math.min(Math.max(0, items.length - full), s + full))}
      >
        <Chevron dir="right" />
      </button>
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
