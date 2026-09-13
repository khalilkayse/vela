-- Product images, shop avatar/terms, order fulfillment, receipt flag.

alter table product_files alter column product_id drop not null;
alter table product_files alter column object_key drop not null;
alter table product_files add column if not exists data bytea;

alter table products add column if not exists cover_file_id integer;

alter table shops add column if not exists avatar_file_id integer;
alter table shops add column if not exists terms text not null default '';
alter table shops add column if not exists contact_email text;

alter table orders add column if not exists fulfilled boolean not null default false;
alter table orders add column if not exists fulfilled_at timestamptz;
alter table orders add column if not exists fulfillment_note text not null default '';
alter table orders add column if not exists receipt_sent boolean not null default false;

create index if not exists product_files_kind_idx on product_files (kind);
