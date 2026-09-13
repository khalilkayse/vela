import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { errMsg } from "@/lib/errors";
import {
  listProductFiles,
  removeProductFile,
  storageReady,
  type ProductFile,
} from "@/lib/server/files";

export function ProductFiles({ productId }: { productId: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState<boolean | null>(null);
  const [files, setFiles] = useState<ProductFile[] | null>(null);
  const [uploading, setUploading] = useState(false);

  async function reload() {
    const next = await listProductFiles({ data: productId });
    setFiles(next);
  }

  useEffect(() => {
    let cancelled = false;
    storageReady()
      .then((r) => {
        if (!cancelled) setReady(r.ok);
      })
      .catch(() => {
        if (!cancelled) setReady(false);
      });
    listProductFiles({ data: productId })
      .then((next) => {
        if (!cancelled) setFiles(next);
      })
      .catch(() => {
        if (!cancelled) setFiles([]);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("productId", String(productId));
      form.append("kind", "delivery");
      const res = await fetch("/api/files/upload", { method: "POST", body: form });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || "Upload failed.");
      toast.success(`${file.name} uploaded.`);
      await reload();
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setUploading(false);
    }
  }

  async function onRemove(file: ProductFile) {
    if (!window.confirm(`Remove ${file.filename}? Buyers of new orders will no longer get this file.`)) return;
    try {
      await removeProductFile({ data: file.id });
      toast.success("File removed.");
      await reload();
    } catch (error) {
      toast.error(errMsg(error));
    }
  }

  if (ready === false) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
        <p className="text-sm font-medium text-fg">Delivery files</p>
        <p className="mt-1.5 text-sm text-muted">
          File storage is not configured yet. The platform owner sets an S3 or R2 bucket in the
          hidden console.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-fg">Delivery files</p>
          <p className="mt-1 text-xs text-muted">
            Private in object storage. Unlocked on the success page after a paid order — max 40 MB each.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={uploading || ready !== true}
          onClick={() => inputRef.current?.click()}
        >
          <Upload />
          {uploading ? "Uploading…" : "Upload"}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        onChange={(event) => void onPick(event)}
      />
      {files === null ? (
        <p className="mt-4 text-sm text-muted">Loading files…</p>
      ) : files.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No files yet. Upload a zip, PDF, or pack.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {files.map((file) => (
            <li key={file.id} className="flex items-center gap-3 py-3">
              <Download className="size-4 shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{file.filename}</p>
                <p className="text-xs text-muted">{formatBytes(file.sizeBytes)}</p>
              </div>
              <button
                type="button"
                className="grid size-11 place-items-center rounded-md text-muted hover:bg-bg hover:text-danger"
                aria-label={`Remove ${file.filename}`}
                onClick={() => void onRemove(file)}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
