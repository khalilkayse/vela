import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { verifyDownloadGrant } from "@/lib/download-token";
import { signedGetUrl } from "@/lib/storage";

export const Route = createFileRoute("/api/files/d/$token")({
  server: {
    handlers: {
      GET: handleDownload,
    },
  },
});

async function handleDownload({ params }: { params: { token: string } }) {
  try {
    const grant = verifyDownloadGrant(params.token);
    const sql = await getSql();
    const orders = await sql.query<{ status: string; product_id: number | null }>(
      "select status, product_id from orders where order_ref = $1 limit 1",
      [grant.orderRef],
    );
    const order = orders[0];
    if (!order || order.status !== "paid") {
      return new Response("This file is only available after a successful purchase.", { status: 403 });
    }
    const files = await sql.query<{ object_key: string; filename: string; product_id: number }>(
      "select object_key, filename, product_id from product_files where id = $1 limit 1",
      [grant.fileId],
    );
    const file = files[0];
    if (!file || file.product_id !== order.product_id) {
      return new Response("File not found.", { status: 404 });
    }
    const url = await signedGetUrl(file.object_key, file.filename, 90);
    return Response.redirect(url, 302);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Download failed.";
    return new Response(message, { status: 400 });
  }
}
