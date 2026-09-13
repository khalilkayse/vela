import { createFileRoute } from "@tanstack/react-router";
import { randomBytes } from "node:crypto";
import { getSessionUser } from "@/lib/auth/verify.server";
import { getSql } from "@/lib/db";
import { objectKey, putObject, s3Configured } from "@/lib/storage";

const MAX_BYTES = 40 * 1024 * 1024;

export const Route = createFileRoute("/api/files/upload")({
  server: {
    handlers: {
      POST: handleUpload,
    },
  },
});

async function handleUpload({ request }: { request: Request }) {
  const user = await getSessionUser();
  if (!user) return json({ error: "Unauthorized" }, 401);
  if (!(await s3Configured())) {
    return json({ error: "File storage is not configured." }, 400);
  }

  const form = await request.formData();
  const file = form.get("file");
  const productId = Number(form.get("productId"));
  const kind = form.get("kind") === "cover" ? "cover" : "delivery";
  if (!(file instanceof File) || !productId) {
    return json({ error: "file and productId are required." }, 400);
  }
  if (file.size > MAX_BYTES) {
    return json({ error: "Files must be 40 MB or smaller." }, 400);
  }

  const sql = await getSql();
  const products = await sql.query<{ id: number; shop_id: number }>(
    "select id, shop_id from products where id = $1 and user_id = $2 limit 1",
    [productId, user.id],
  );
  if (!products[0]) return json({ error: "Product not found." }, 404);

  const filename = file.name || "file";
  const contentType = file.type || "application/octet-stream";
  const fileId = randomBytes(8).toString("hex");
  const key = objectKey(products[0].shop_id, products[0].id, fileId, filename);
  const body = new Uint8Array(await file.arrayBuffer());
  await putObject({ key, body, contentType });

  const rows = await sql.query<{ id: number }>(
    `insert into product_files
      (product_id, shop_id, user_id, object_key, filename, content_type, size_bytes, kind)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning id`,
    [products[0].id, products[0].shop_id, user.id, key, filename, contentType, file.size, kind],
  );

  return json({
    id: rows[0]?.id,
    filename,
    sizeBytes: file.size,
    kind,
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
