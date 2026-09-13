import { cn } from "@/lib/utils";

const PALETTES: Record<string, [string, string, string]> = {
  "mesh-1": ["#c93d20", "#e24b2a", "#f4c7b8"],
  "mesh-2": ["#143f36", "#1e6b5a", "#b7e0d4"],
  "mesh-3": ["#1c1712", "#5c4033", "#e8d5c4"],
  "mesh-4": ["#e24b2a", "#f08a4b", "#fff2d8"],
  "mesh-5": ["#3d4a1f", "#7a8f3d", "#e4ecc4"],
  "mesh-6": ["#2a1d16", "#8b4518", "#f0d9b5"],
  dusk: ["#1c1712", "#e24b2a", "#f6e4c8"],
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
        <circle cx="320" cy="40" r="90" fill={c} opacity="0.28" />
        <circle cx="60" cy="210" r="110" fill={a} opacity="0.4" />
        <path d="M0 180 C 80 120, 160 220, 400 90 L 400 260 L 0 260 Z" fill={c} opacity="0.2" />
        <path d="M40 40 L 120 40 L 80 110 Z" fill="white" opacity="0.1" />
      </svg>
      {title ? (
        <div className="relative flex h-full min-h-28 items-end p-4">
          <p className="max-w-[18ch] font-display text-lg font-bold leading-tight tracking-tight text-primary-fg">
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
