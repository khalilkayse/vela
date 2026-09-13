import { useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ImageWell({
  label,
  hint,
  url,
  onFile,
  onClear,
  compact = false,
  busy = false,
}: {
  label: string;
  hint?: string;
  url?: string | null;
  onFile: (file: File) => void;
  onClear?: () => void;
  compact?: boolean;
  busy?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      {label ? <p className="mb-2 text-sm font-medium text-fg">{label}</p> : null}
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-dashed border-border bg-bg",
          compact ? "h-24 w-24" : "aspect-[16/10] w-full",
        )}
      >
        {url ? (
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <button
            type="button"
            className="grid size-full place-items-center text-muted hover:bg-surface"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            <span className="flex flex-col items-center gap-1 text-xs">
              <ImagePlus className="size-5" />
              {busy ? "Uploading…" : "Add image"}
            </span>
          </button>
        )}
        {url ? (
          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 p-2">
            <button
              type="button"
              className="rounded-md bg-surface/90 px-2 py-1 text-xs font-medium text-fg hover:bg-surface"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              Replace
            </button>
            {onClear ? (
              <button
                type="button"
                className="grid size-7 place-items-center rounded-md bg-surface/90 text-fg hover:text-danger"
                onClick={onClear}
                aria-label="Remove image"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
    </div>
  );
}
