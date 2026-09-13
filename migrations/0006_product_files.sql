-- Private product files stored in S3/R2. Downloads are gated by a paid order.

create table if not exists product_files (
  id serial primary key,
  product_id integer not null references products(id) on delete cascade,
  shop_id integer not null references shops(id) on delete cascade,
  user_id text not null,
  object_key text not null unique,
  filename text not null,
  content_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0,
  kind text not null default 'delivery',
  created_at timestamptz not null default now()
);

create index if not exists product_files_product_id_idx on product_files (product_id);
create index if not exists product_files_shop_id_idx on product_files (shop_id);
