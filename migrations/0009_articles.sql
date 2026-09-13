-- Rich article body. Paid articles stay readable on the page after checkout
-- (no download) — the app withholds body_html until a matching paid order.

alter table products add column if not exists body_html text not null default '';
