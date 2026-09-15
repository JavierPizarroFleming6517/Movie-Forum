import { useState } from "react";
import { cn } from "../ui";

/** Old reviews used 1–10; new ones use 1–5. */
export function forumStars(rating: number | null | undefined) {
  const n = Number(rating);
  if (!n) return 0;
  const stars = n > 5 ? Math.round(n / 2) : n;
  return Math.min(5, Math.max(0, stars));
}

export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 28,
}: {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= shown;
        return (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
            className={cn(
              "border-0 bg-transparent p-0 leading-none",
              readOnly ? "cursor-default" : "cursor-pointer",
            )}
            onMouseEnter={() => {
              if (!readOnly) setHover(n);
            }}
            onClick={() => onChange?.(n)}
          >
            <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 3.2l2.35 4.76 5.25.76-3.8 3.7.9 5.22L12 15.18 7.3 17.64l.9-5.22-3.8-3.7 5.25-.76L12 3.2z"
                fill={filled ? "#F5C518" : "none"}
                stroke={filled ? "#F5C518" : "#6b7280"}
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
