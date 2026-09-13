import { cn } from "@/lib/utils";
import type { ShopLayout } from "@/lib/constants";

export function LayoutSketch({
  layout,
  className,
}: {
  layout: ShopLayout;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-lg border border-border bg-bg p-3",
        className,
      )}
      aria-hidden="true"
    >
      <div className="flex w-full flex-1 flex-col justify-center">
        {layout === "shop" ? <ShopSketch /> : layout === "links" ? <PageSketch /> : <StudioSketch />}
      </div>
    </div>
  );
}

function StudioSketch() {
  return (
    <div className="space-y-2">
      <div className="flex flex-col items-center gap-1.5">
        <span className="size-8 rounded-full bg-primary" />
        <span className="h-1.5 w-16 rounded-full bg-fg/80" />
        <span className="h-1 w-24 rounded-full bg-border" />
      </div>
      <span className="block h-7 rounded-md border border-border bg-surface" />
      <span className="block h-7 rounded-md border border-border bg-surface" />
      <div className="h-16 overflow-hidden rounded-md bg-primary/90" />
    </div>
  );
}

function ShopSketch() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="size-6 rounded-md bg-primary" />
        <span className="h-1.5 w-20 rounded-full bg-fg/80" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <span className="h-14 rounded-md bg-primary/90" />
        <span className="h-14 rounded-md bg-accent/80" />
        <span className="h-14 rounded-md bg-fg/70" />
        <span className="h-14 rounded-md bg-primary/50" />
      </div>
    </div>
  );
}

function PageSketch() {
  return (
    <div className="space-y-2">
      <div className="flex flex-col items-center gap-1.5 pb-1">
        <span className="size-8 rounded-full bg-primary" />
        <span className="h-1.5 w-14 rounded-full bg-fg/80" />
      </div>
      <span className="block h-8 rounded-full border border-border bg-surface" />
      <span className="block h-8 rounded-full border border-border bg-surface" />
      <span className="block h-8 rounded-full border border-border bg-surface" />
    </div>
  );
}
