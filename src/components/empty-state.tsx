import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * A failed load (network error, a 403, a bad query) looks nothing like "no
 * rows yet" — show it plainly instead of silently falling back to an empty
 * list, which reads as "there's nothing here" rather than "something broke."
 */
export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-xl border border-danger/30 bg-danger/5 px-6 py-10",
        className,
      )}
    >
      <h3 className="text-base font-semibold tracking-tight text-fg">Could not load this</h3>
      <p className="max-w-md text-sm leading-relaxed text-muted">
        {message || "Something went wrong. Try again in a moment."}
      </p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-xl border border-dashed border-border bg-surface px-6 py-10",
        className,
      )}
    >
      <h3 className="text-base font-semibold tracking-tight text-fg">{title}</h3>
      <p className="max-w-md text-sm leading-relaxed text-muted">{body}</p>
      {action}
    </div>
  );
}
