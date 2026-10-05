import {
  cloneElement,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md border border-border bg-surface px-3.5 text-sm text-fg",
        "placeholder:text-subtle shadow-[inset_0_1px_0_rgb(0_0_0/0.03)]",
        "transition-[border-color,box-shadow] duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-accent",
        "disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-fg",
        "placeholder:text-subtle",
        "transition-[border-color,box-shadow] duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-accent",
        "disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-[13px] font-medium text-fg", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  const generatedId = useId();
  // Clicking the label should focus the field — give the control an id (if
  // it doesn't already have one) and point the label at it, instead of
  // relying on implicit wrapping (there is none here; `Label` and the
  // control are siblings).
  const control =
    isValidElement(children) && !(children as ReactElement<{ id?: string }>).props.id
      ? cloneElement(children as ReactElement<{ id?: string }>, { id: generatedId })
      : children;
  const controlId =
    isValidElement(children) ? (children as ReactElement<{ id?: string }>).props.id ?? generatedId : undefined;

  return (
    <div>
      <Label htmlFor={controlId}>{label}</Label>
      {control}
      {hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
