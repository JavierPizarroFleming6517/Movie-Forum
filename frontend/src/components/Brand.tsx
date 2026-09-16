import { Link } from "react-router-dom";
import { cn } from "../ui";

export function Brand({
  to = "/inicio",
  onClick,
  className,
}: {
  to?: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "inline-block shrink-0 border-b-2 border-accent-text pb-0.5 text-[13px] font-semibold tracking-[0.22em] text-white",
        className,
      )}
    >
      FOROPELIS
    </Link>
  );
}
