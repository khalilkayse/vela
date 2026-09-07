import { cn } from "@/lib/utils";

const PALETTES: Record<string, [string, string, string]> = {
  "mesh-1": ["#3b1578", "#6d28d9", "#c4b5fd"],
  "mesh-2": ["#1e1b4b", "#4c1d95", "#a78bfa"],
  "mesh-3": ["#2e1065", "#7c3aed", "#ddd6fe"],
  "mesh-4": ["#4c1d95", "#5b21b6", "#f5f3ff"],
  "mesh-5": ["#1a1025", "#6d28d9", "#ede9fe"],
  "mesh-6": ["#3b0764", "#8b5cf6", "#c4b5fd"],
  dusk: ["#1a1025", "#4c1d95", "#e9d5ff"],
};

function palette(style: string): [string, string, string] {
  return PALETTES[style] ?? PALETTES["mesh-1"];
}

export function ProductCover({
  style = "mesh-1",
  title,
  className,
}: {
  style?: string;
  title?: string;
  className?: string;
}) {
  const [a, b, c] = palette(style);
  const id = style.replace(/[^a-z0-9-]/gi, "");
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-primary text-primary-fg",
        className,
      )}
    >
      <svg className="absolute inset-0 size-full" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={a} />
            <stop offset="100%" stopColor={b} />
          </linearGradient>
        </defs>
        <rect width="400" height="260" fill={`url(#${id}-g)`} />
        <circle cx="320" cy="40" r="90" fill={c} opacity="0.22" />
        <circle cx="60" cy="210" r="110" fill={a} opacity="0.45" />
        <path d="M0 180 C 80 120, 160 220, 400 90 L 400 260 L 0 260 Z" fill={c} opacity="0.16" />
        <path d="M40 40 L 120 40 L 80 110 Z" fill="white" opacity="0.08" />
      </svg>
      {title ? (
        <div className="relative flex h-full min-h-28 items-end p-4">
          <p className="max-w-[18ch] font-display text-lg leading-tight tracking-tight text-white">
            {title}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function CoverPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {Object.keys(PALETTES)
        .filter((k) => k.startsWith("mesh"))
        .map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-label={key}
            className={cn(
              "h-11 overflow-hidden rounded-sm ring-offset-2 transition-[box-shadow] duration-150",
              value === key ? "ring-2 ring-primary" : "ring-1 ring-border",
            )}
          >
            <ProductCover style={key} className="h-11 rounded-none" />
          </button>
        ))}
    </div>
  );
}
