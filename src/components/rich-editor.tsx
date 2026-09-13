import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Quill, created only in the browser so SSR never touches `document`.
 * Toolbar buttons are forced to type="button" so they cannot submit the
 * surrounding product form.
 */
export function RichEditor({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const initialRef = useRef(value);
  const placeholderRef = useRef(placeholder);
  onChangeRef.current = onChange;

  useEffect(() => {
    const host = hostRef.current;
    const wrap = wrapRef.current;
    if (!host || !wrap) return;
    let cancelled = false;
    let observer: MutationObserver | null = null;

    function markButtons() {
      wrapRef.current?.querySelectorAll("button").forEach((btn) => {
        if (!btn.getAttribute("type") || btn.getAttribute("type") === "submit") {
          btn.setAttribute("type", "button");
        }
      });
    }

    void (async () => {
      const { default: Quill } = await import("quill");
      if (cancelled || !hostRef.current || !wrapRef.current) return;
      if (wrapRef.current.querySelector(".ql-toolbar")) return;
      const instance = new Quill(hostRef.current, {
        theme: "snow",
        placeholder: placeholderRef.current || "Write…",
        modules: {
          toolbar: [
            [{ header: [2, 3, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }, { list: "bullet" }],
            ["blockquote", "link"],
            ["clean"],
          ],
        },
      });
      markButtons();
      observer = new MutationObserver(markButtons);
      observer.observe(wrapRef.current, { childList: true, subtree: true });
      const start = initialRef.current.trim();
      if (start) instance.clipboard.dangerouslyPasteHTML(start);
      instance.on("text-change", () => {
        const html = instance.root.innerHTML;
        const empty = html === "<p><br></p>" || html === "<p></p>" || html === "";
        onChangeRef.current(empty ? "" : html);
      });
    })();

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} className={cn("rich-editor", className)}>
      <div ref={hostRef} />
    </div>
  );
}
