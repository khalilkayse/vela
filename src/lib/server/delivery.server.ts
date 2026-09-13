import { getSql } from "@/lib/db";
import { signDownloadGrant } from "@/lib/download-token";

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
