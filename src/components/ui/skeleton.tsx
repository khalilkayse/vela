import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-border/70", className)} />
  );
}

export function Switch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className="inline-flex items-center gap-2"
    >
      <span
        className={
          "relative h-6 w-10 rounded-full transition-colors duration-150 " +
          (checked ? "bg-primary" : "bg-border")
        }
      >
        <span
          className={
            "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-150 " +
            (checked ? "translate-x-4" : "translate-x-0.5")
          }
        />
      </span>
      {label ? <span className="text-sm text-fg">{label}</span> : null}
    </button>
  );
}
