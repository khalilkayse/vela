import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { mapBlock, type BlockRow, type ShopRow } from "./map";

export const listMyBlocks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<BlockRow>`
      select * from page_blocks where user_id = ${context.userId}
      order by sort_order asc, id asc
    `;
    return rows.map(mapBlock);
  });

export const saveBlock = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: number; kind?: string; title: string; url?: string; visible?: boolean }) => {
    const title = input.title.trim();
    if (!title) throw new Error("Give this block a title.");
    const kind = input.kind === "heading" ? "heading" : "link";
    const url = (input.url ?? "").trim();
    if (kind === "link" && !url) throw new Error("Links need a URL.");
    return {
      id: input.id,
      kind,
      title: title.slice(0, 80),
      url: url ? url.slice(0, 500) : null,
      visible: input.visible !== false,
    };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const shops = await sql<ShopRow>`select * from shops where user_id = ${context.userId} limit 1`;
    if (!shops[0]) throw new Error("Create a shop first.");
    if (data.id) {
      const rows = await sql<BlockRow>`
        update page_blocks set
          kind = ${data.kind},
          title = ${data.title},
          url = ${data.url},
          visible = ${data.visible}
        where id = ${data.id} and user_id = ${context.userId}
        returning *
      `;
      if (!rows[0]) throw new Error("Block not found.");
      return mapBlock(rows[0]);
    }
    const count = await sql<{ n: number }>`
      select count(*)::int as n from page_blocks where shop_id = ${shops[0].id}
    `;
    const rows = await sql<BlockRow>`
      insert into page_blocks (shop_id, user_id, kind, title, url, sort_order, visible)
      values (${shops[0].id}, ${context.userId}, ${data.kind}, ${data.title}, ${data.url}, ${count[0]?.n ?? 0}, ${data.visible})
      returning *
    `;
    return mapBlock(rows[0]);
  });

export const deleteBlock = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`delete from page_blocks where id = ${id} and user_id = ${context.userId}`;
    return { ok: true };
  });

export const reorderBlocks = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((ids: number[]) => ids)
  .handler(async ({ context, data: ids }) => {
    const sql = await getSql();
    for (let i = 0; i < ids.length; i += 1) {
      await sql`
        update page_blocks set sort_order = ${i}
        where id = ${ids[i]} and user_id = ${context.userId}
      `;
    }
    return { ok: true };
  });
