import { useEffect, useState } from "react";
import { Field, Input } from "@/components/ui/input";
import { usernameAvailable } from "@/lib/server/shops";
import { cn } from "@/lib/utils";

export function UsernameField({
  value,
  onChange,
  origin = "",
}: {
  value: string;
  onChange: (next: string) => void;
  origin?: string;
}) {
  const [availability, setAvailability] = useState<{ ok: boolean; reason: string } | null>(null);

  useEffect(() => {
    const next = value.trim().toLowerCase();
    if (next.length < 3) {
      setAvailability(null);
      return;
    }
    const timer = window.setTimeout(() => {
      usernameAvailable({ data: next })
        .then(setAvailability)
        .catch(() => setAvailability(null));
    }, 280);
    return () => window.clearTimeout(timer);
  }, [value]);

  return (
    <Field label="Username" hint="3 to 24 letters, numbers, or hyphens. This is the shareable link.">
      <div className="flex overflow-hidden rounded-md border border-border bg-surface focus-within:ring-2 focus-within:ring-ring/40">
        <span className="grid place-items-center bg-bg px-3 text-sm text-muted">/</span>
        <input
          required
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          className="h-11 flex-1 bg-transparent px-3 text-sm text-fg outline-none"
          placeholder="maya"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {availability ? (
        <p className={cn("mt-1.5 text-xs", availability.ok ? "text-success" : "text-danger")}>
          {availability.ok && origin ? `${origin}/${value} is available.` : availability.reason}
        </p>
      ) : null}
    </Field>
  );
}

export function UsernameInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [availability, setAvailability] = useState<{ ok: boolean; reason: string } | null>(null);

  useEffect(() => {
    const next = value.trim().toLowerCase();
    if (next.length < 3) {
      setAvailability(null);
      return;
    }
    const timer = window.setTimeout(() => {
      usernameAvailable({ data: next })
        .then(setAvailability)
        .catch(() => setAvailability(null));
    }, 280);
    return () => window.clearTimeout(timer);
  }, [value]);

  return (
    <div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value.toLowerCase())}
        required
        autoComplete="off"
        spellCheck={false}
      />
      {availability ? (
        <p className={cn("mt-1.5 text-xs", availability.ok ? "text-success" : "text-danger")}>
          {availability.reason}
        </p>
      ) : null}
    </div>
  );
}
