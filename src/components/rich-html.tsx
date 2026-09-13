import { htmlToPlain, looksLikeHtml } from "@/lib/html";
import { cn } from "@/lib/utils";

export function RichHtml({ html, className }: { html: string; className?: string }) {
  const value = (html ?? "").trim();
  if (!value) return null;
  if (!looksLikeHtml(value)) {
    return (
      <p className={cn("whitespace-pre-wrap text-sm leading-relaxed text-muted", className)}>
        {value}
      </p>
    );
  }
  if (!htmlToPlain(value)) return null;
  return <div className={cn("rich-html", className)} dangerouslySetInnerHTML={{ __html: value }} />;
}
