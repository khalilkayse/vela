import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("size-7", className)}
    >
      <rect width="32" height="32" rx="8" fill="currentColor" className="text-primary" />
      <path
        d="M10 8.5v15M10 16.2 22 8.8M10 16.2 22 23.2"
        fill="none"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-fg", className)}>
      <Mark className={markClassName} />
      <span className="text-[17px] font-semibold tracking-[-0.03em]">{APP_NAME}</span>
    </span>
  );
}
