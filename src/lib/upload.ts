export type UploadedMedia = {
  id: number;
  filename: string;
  sizeBytes: number;
  kind: string;
  url: string;
};

export async function uploadMedia(
  file: File,
  opts: { productId?: number; kind: "cover" | "gallery" | "avatar" | "delivery" },
): Promise<UploadedMedia> {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", opts.kind);
  if (opts.productId) form.append("productId", String(opts.productId));
  const res = await fetch("/api/files/upload", { method: "POST", body: form });
  const body = (await res.json().catch(() => ({}))) as { error?: string } & Partial<UploadedMedia>;
  if (!res.ok) throw new Error(body.error || "Upload failed.");
  if (!body.id) throw new Error("Upload failed.");
  return {
    id: body.id,
    filename: body.filename || file.name,
    sizeBytes: body.sizeBytes ?? file.size,
    kind: body.kind || opts.kind,
    url: body.url || `/api/files/public/${body.id}`,
  };
}

export function publicMediaPath(id: number): string {
  return `/api/files/public/${id}`;
}
