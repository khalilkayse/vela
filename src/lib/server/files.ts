import { createServerFn } from "@tanstack/react-start";
import { randomBytes } from "node:crypto";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { objectKey, deleteObject, s3Configured } from "@/lib/storage";
import { signDownloadGrant } from "@/lib/download-token";
import { publicMediaPath } from "@/lib/upload";

export type ProductFile = {
  id: number;
  productId: number | null;
  filename: string;
  contentType: string;
  sizeBytes: number;
  kind: string;
  url: string | null;
  createdAt: string;
};

type FileRow = {
  id: number;
  product_id: number | null;
  filename: string;
  content_type: string;
  size_bytes: unknown;
  kind: string;
  created_at: unknown;
};

function mapFile(row: FileRow): ProductFile {
  const publicKind = row.kind === "cover" || row.kind === "gallery" || row.kind === "avatar";
  return {
    id: row.id,
    productId: row.product_id,
    filename: row.filename,
    contentType: row.content_type,
    sizeBytes: Number(row.size_bytes ?? 0),
    kind: row.kind,
    url: publicKind ? publicMediaPath(row.id) : null,
    createdAt: String(row.created_at ?? ""),
  };
}

export const storageReady = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => ({ ok: await s3Configured() }));

export const listProductFiles = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: number | { productId: number; kind?: string }) =>
    typeof input === "number"
      ? { productId: Number(input), kind: undefined as string | undefined }
      : { productId: Number(input.productId), kind: input.kind },
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = data.kind
      ? await sql.query<FileRow>(
          `select id, product_id, filename, content_type, size_bytes, kind, created_at
           from product_files where product_id = $1 and user_id = $2 and kind = $3 order by id asc`,
          [data.productId, context.userId, data.kind],
        )
      : await sql.query<FileRow>(
          `select id, product_id, filename, content_type, size_bytes, kind, created_at
           from product_files where product_id = $1 and user_id = $2 order by id asc`,
          [data.productId, context.userId],
        );
    return rows.map(mapFile);
  });

export const registerProductFile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    productId: number;
    filename: string;
    contentType: string;
    sizeBytes: number;
    kind?: string;
  }) => ({
    productId: Number(input.productId),
    filename: input.filename.trim().slice(0, 180) || "file",
    contentType: input.contentType.trim() || "application/octet-stream",
    sizeBytes: Math.max(0, Number(input.sizeBytes) || 0),
    kind: input.kind === "cover" || input.kind === "gallery" || input.kind === "avatar" ? input.kind : "delivery",
  }))
  .handler(async ({ context, data }) => {
    if (!(await s3Configured())) throw new Error("File storage is not configured yet.");
    const sql = await getSql();
    const products = await sql.query<{ id: number; shop_id: number }>(
      "select id, shop_id from products where id = $1 and user_id = $2 limit 1",
      [data.productId, context.userId],
    );
    if (!products[0]) throw new Error("Product not found.");
    const fileId = randomBytes(8).toString("hex");
    const key = objectKey(products[0].shop_id, products[0].id, fileId, data.filename);
    const rows = await sql.query<FileRow>(
      `insert into product_files
        (product_id, shop_id, user_id, object_key, filename, content_type, size_bytes, kind)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning id, product_id, filename, content_type, size_bytes, kind, created_at`,
      [
        products[0].id,
        products[0].shop_id,
        context.userId,
        key,
        data.filename,
        data.contentType,
        data.sizeBytes,
        data.kind,
      ],
    );
    return { file: mapFile(rows[0]), objectKey: key };
  });

export const removeProductFile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((fileId: number) => Number(fileId))
  .handler(async ({ context, data: fileId }) => {
    const sql = await getSql();
    const rows = await sql.query<{ object_key: string | null; kind: string; product_id: number | null }>(
      "select object_key, kind, product_id from product_files where id = $1 and user_id = $2 limit 1",
      [fileId, context.userId],
    );
    if (!rows[0]) throw new Error("File not found.");
    if (rows[0].kind === "cover" && rows[0].product_id) {
      await sql.query("update products set cover_file_id = null where id = $1 and cover_file_id = $2", [
        rows[0].product_id,
        fileId,
      ]);
    }
    if (rows[0].kind === "avatar") {
      await sql.query("update shops set avatar_file_id = null where user_id = $1 and avatar_file_id = $2", [
        context.userId,
        fileId,
      ]);
    }
    await sql.query("delete from product_files where id = $1 and user_id = $2", [fileId, context.userId]);
    if (rows[0].object_key) await deleteObject(rows[0].object_key);
    return { ok: true as const };
  });

export async function filesForPaidOrder(orderRef: string): Promise<{ name: string; url: string }[]> {
  const sql = await getSql();
  const orders = await sql.query<{ product_id: number | null; status: string }>(
    "select product_id, status from orders where order_ref = $1 limit 1",
    [orderRef],
  );
  if (!orders[0] || orders[0].status !== "paid" || !orders[0].product_id) return [];
  const files = await sql.query<{ id: number; filename: string }>(
    "select id, filename from product_files where product_id = $1 and kind = 'delivery' order by id asc",
    [orders[0].product_id],
  );
  return files.map((file) => ({
    name: file.filename,
    url: `/api/files/d/${signDownloadGrant(orderRef, file.id)}`,
  }));
}
