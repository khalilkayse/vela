import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { getObjectBytes } from "@/lib/storage";

export const Route = createFileRoute("/api/files/public/$id")({
  server: {
    handlers: {
      GET: handlePublic,
    },
  },
});

function asBytes(value: unknown): Buffer | null {
  if (!value) return null;
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  return null;
}

async function handlePublic({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) return new Response("Not found.", { status: 404 });
  const sql = await getSql();
  const rows = await sql.query<{
    kind: string;
    object_key: string | null;
    content_type: string;
    data: unknown;
    filename: string;
  }>("select kind, object_key, content_type, data, filename from product_files where id = $1 limit 1", [id]);
  const file = rows[0];
  if (!file) return new Response("Not found.", { status: 404 });
  if (file.kind === "delivery") {
    return new Response("This file is only available after a successful purchase.", { status: 403 });
  }

  const inline = file.kind === "cover" || file.kind === "gallery" || file.kind === "avatar";
  const headers: Record<string, string> = {
    "Content-Type": file.content_type || "application/octet-stream",
    "Cache-Control": "public, max-age=86400",
  };
  if (!inline) {
    headers["Content-Disposition"] = `attachment; filename="${file.filename.replace(/"/g, "")}"`;
  }

  const blob = asBytes(file.data);
  if (blob) return new Response(blob as unknown as BodyInit, { headers });
  if (file.object_key) {
    const stored = await getObjectBytes(file.object_key);
    if (!stored) return new Response("Not found.", { status: 404 });
    return new Response(Buffer.from(stored.body) as unknown as BodyInit, {
      headers: { ...headers, "Content-Type": stored.contentType || headers["Content-Type"] },
    });
  }
  return new Response("Not found.", { status: 404 });
}
