import { createFileRoute } from "@tanstack/react-router";
import { randomBytes } from "node:crypto";
import { getSessionUser } from "@/lib/auth/verify.server";
import { getSql } from "@/lib/db";
import { objectKey, putObject, s3Configured, deleteObject } from "@/lib/storage";
import { publicMediaPath } from "@/lib/upload";

const MAX_FILE_BYTES = 40 * 1024 * 1024;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/jpg"]);

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

  const form = await request.formData();
  const file = form.get("file");
  const productIdRaw = form.get("productId");
  const productId = productIdRaw ? Number(productIdRaw) : 0;
  const kindRaw = String(form.get("kind") || "delivery");
  const kind =
    kindRaw === "cover" || kindRaw === "gallery" || kindRaw === "avatar" || kindRaw === "delivery"
      ? kindRaw
      : "delivery";
  if (!(file instanceof File)) return json({ error: "A file is required." }, 400);

  const isImage = kind === "cover" || kind === "gallery" || kind === "avatar";
  if (isImage) {
    const type = (file.type || "").toLowerCase();
    if (!IMAGE_TYPES.has(type) && !type.startsWith("image/")) {
      return json({ error: "Use a JPG, PNG, WebP, or GIF." }, 400);
    }
    if (file.size > MAX_IMAGE_BYTES) return json({ error: "Images must be 4 MB or smaller." }, 400);
  } else {
    if (file.size > MAX_FILE_BYTES) return json({ error: "Files must be 40 MB or smaller." }, 400);
    if (!(await s3Configured())) return json({ error: "File storage is not configured." }, 400);
  }

  const sql = await getSql();
  const shops = await sql.query<{ id: number }>("select id from shops where user_id = $1 limit 1", [user.id]);
  if (!shops[0]) return json({ error: "Create a shop first." }, 400);
  const shopId = shops[0].id;

  let resolvedProductId: number | null = null;
  if (kind !== "avatar") {
    if (!productId) return json({ error: "productId is required." }, 400);
    const products = await sql.query<{ id: number; shop_id: number }>(
      "select id, shop_id from products where id = $1 and user_id = $2 limit 1",
      [productId, user.id],
    );
    if (!products[0]) return json({ error: "Product not found." }, 404);
    resolvedProductId = products[0].id;
  }

  const filename = file.name || "file";
  const contentType = file.type || (isImage ? "image/jpeg" : "application/octet-stream");
  const fileId = randomBytes(8).toString("hex");
  const body = Buffer.from(await file.arrayBuffer());
  const hasS3 = await s3Configured();
  let key: string | null = null;
  let data: Buffer | null = null;

  if (hasS3) {
    key = objectKey(shopId, resolvedProductId, fileId, filename);
    await putObject({ key, body, contentType });
  } else {
    data = body;
  }

  const rows = await sql.query<{ id: number }>(
    `insert into product_files
      (product_id, shop_id, user_id, object_key, filename, content_type, size_bytes, kind, data)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     returning id`,
    [resolvedProductId, shopId, user.id, key, filename, contentType, file.size, kind, data],
  );
  const id = rows[0]?.id;
  if (!id) return json({ error: "Could not save the file." }, 500);

  if (kind === "cover" && resolvedProductId) {
    const previous = await sql.query<{ id: number; object_key: string | null }>(
      `select id, object_key from product_files
       where product_id = $1 and kind = 'cover' and id <> $2`,
      [resolvedProductId, id],
    );
    await sql.query("update products set cover_file_id = $1, updated_at = now() where id = $2", [
      id,
      resolvedProductId,
    ]);
    for (const old of previous) {
      await sql.query("delete from product_files where id = $1", [old.id]);
      if (old.object_key) await deleteObject(old.object_key);
    }
  }

  if (kind === "avatar") {
    const previous = await sql.query<{ id: number; object_key: string | null }>(
      `select id, object_key from product_files
       where shop_id = $1 and kind = 'avatar' and id <> $2`,
      [shopId, id],
    );
    await sql.query("update shops set avatar_file_id = $1, updated_at = now() where id = $2", [id, shopId]);
    for (const old of previous) {
      await sql.query("delete from product_files where id = $1", [old.id]);
      if (old.object_key) await deleteObject(old.object_key);
    }
  }

  return json({
    id,
    filename,
    sizeBytes: file.size,
    kind,
    url: isImage ? publicMediaPath(id) : null,
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
