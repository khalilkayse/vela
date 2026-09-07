import { Link } from "@tanstack/react-router";
import { Globe, Instagram, Youtube } from "lucide-react";
import { ProductCover } from "@/components/product-cover";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/card";
import type { PageBlock, Product, Shop } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

function XMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.743l7.73-8.835L1.254 2.25H8.08l4.253 5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117Z"
      />
    </svg>
  );
}

function TikTokMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M14.5 3c.4 2.6 1.8 4.4 4.5 4.7v3.1c-1.5 0-2.9-.5-4.1-1.3v6.8c0 3.5-2.7 6.2-6.2 6.2S2.5 19.8 2.5 16.3c0-3.4 2.6-6.1 6-6.2v3.2c-1.6.1-2.8 1.4-2.8 3 0 1.7 1.4 3 3.1 3s3.1-1.3 3.1-3V3h2.6Z"
      />
    </svg>
  );
}

export function Storefront({
  shop,
  products,
  blocks,
}: {
  shop: Shop;
  products: Product[];
  blocks: PageBlock[];
}) {
  const paid = products.filter((p) => p.kind !== "link");
  const links = products.filter((p) => p.kind === "link");
  const featured = paid.filter((p) => p.featured);
  const rest = paid.filter((p) => !p.featured);
  const catalog = [...featured, ...rest];
  const isLinks = shop.layout === "links";
  const isShop = shop.layout === "shop";

  return (
    <div className="min-h-screen bg-bg">
      <div className={cn("mx-auto px-4 pb-20 pt-10", isLinks ? "max-w-md" : "max-w-3xl sm:px-6")}>
        <header className={cn("flex flex-col", isLinks || !isShop ? "items-center text-center" : "items-start")}>
          <span className="grid size-20 place-items-center rounded-xl bg-primary font-display text-2xl text-primary-fg">
            {shop.avatarInitials}
          </span>
          <h1 className="mt-5 font-display text-4xl tracking-tight text-fg">{shop.displayName}</h1>
          {shop.tagline ? (
            <p className="mt-2 max-w-md text-base leading-relaxed text-muted">{shop.tagline}</p>
          ) : null}
          {shop.bio && !isShop ? (
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted">{shop.bio}</p>
          ) : null}
          <Socials shop={shop} className="mt-5" />
        </header>

        {blocks.length > 0 && shop.layout !== "shop" ? (
          <section className="mt-8 space-y-3">
            {blocks.map((block) =>
              block.kind === "heading" ? (
                <h2 key={block.id} className="pt-2 text-xs font-semibold uppercase tracking-[0.14em] text-subtle">
                  {block.title}
                </h2>
              ) : (
                <a
                  key={block.id}
                  href={block.url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-12 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-fg shadow-soft transition-[transform,background-color] duration-150 hover:bg-bg active:scale-[0.98]"
                >
                  {block.title}
                </a>
              ),
            )}
          </section>
        ) : null}

        {links.length > 0 && shop.layout === "links" ? (
          <section className="mt-3 space-y-3">
            {links.map((product) => (
              <Link
                key={product.id}
                to="/$username/$slug"
                params={{ username: shop.username, slug: product.slug }}
                className="flex h-12 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-fg shadow-soft"
              >
                {product.title}
              </Link>
            ))}
          </section>
        ) : null}

        {catalog.length > 0 && shop.layout !== "links" ? (
          <section className="mt-10">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold tracking-tight text-fg">
                {isShop ? "Catalog" : "Products & services"}
              </h2>
              <span className="text-xs text-muted">{catalog.length} listed</span>
            </div>
            <div className={cn("grid gap-4", isShop ? "sm:grid-cols-2" : "grid-cols-1")}>
              {catalog.map((product) => (
                <ProductCard key={product.id} shop={shop} product={product} compact={isShop} />
              ))}
            </div>
          </section>
        ) : null}

        {links.length > 0 && shop.layout !== "links" ? (
          <section className="mt-10">
            <h2 className="mb-3 text-sm font-semibold tracking-tight text-fg">Free resources</h2>
            <div className="space-y-3">
              {links.map((product) => (
                <Link
                  key={product.id}
                  to="/$username/$slug"
                  params={{ username: shop.username, slug: product.slug }}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-fg"
                >
                  <span>{product.title}</span>
                  <span className="text-muted">Free</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {catalog.length === 0 && links.length === 0 && blocks.length === 0 ? (
          <p className="mt-12 text-center text-sm text-muted">Nothing listed yet.</p>
        ) : null}

        <p className="mt-16 flex items-center justify-center gap-2 text-xs text-subtle">
          <Link to="/" className="text-subtle hover:text-muted" aria-label="Vela">
            <Logo markClassName="size-5" />
          </Link>
        </p>
      </div>
    </div>
  );
}

function Socials({ shop, className }: { shop: Shop; className?: string }) {
  const items = [
    shop.websiteUrl ? { href: shop.websiteUrl, label: "Website", icon: Globe } : null,
    shop.instagramUrl ? { href: shop.instagramUrl, label: "Instagram", icon: Instagram } : null,
    shop.xUrl ? { href: shop.xUrl, label: "X", icon: XMark } : null,
    shop.youtubeUrl ? { href: shop.youtubeUrl, label: "YouTube", icon: Youtube } : null,
    shop.tiktokUrl ? { href: shop.tiktokUrl, label: "TikTok", icon: TikTokMark } : null,
  ].filter(Boolean) as { href: string; label: string; icon: typeof Globe }[];
  if (items.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <a
            key={item.href}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            aria-label={item.label}
            className="grid size-11 place-items-center rounded-md border border-border bg-surface text-fg hover:bg-bg"
          >
            <Icon className="size-4" />
          </a>
        );
      })}
    </div>
  );
}

export function ProductCard({
  shop,
  product,
  compact = false,
}: {
  shop: Shop;
  product: Product;
  compact?: boolean;
}) {
  return (
    <Link
      to="/$username/$slug"
      params={{ username: shop.username, slug: product.slug }}
      className="group overflow-hidden rounded-xl border border-border bg-surface shadow-soft transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5"
    >
      <ProductCover
        style={product.coverStyle}
        title={compact ? undefined : product.title}
        className={compact ? "aspect-[16/10]" : "aspect-[16/9]"}
      />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-fg">{product.title}</p>
            {product.description ? (
              <p className="mt-1 line-clamp-2 text-sm text-muted">{product.description}</p>
            ) : null}
          </div>
          <p className="shrink-0 tabular-nums text-sm font-semibold text-fg">
            {product.kind === "link" ? "Free" : formatPrice(product.price, product.currency)}
          </p>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Badge tone="primary">{product.kind === "service" ? "Service" : "Digital"}</Badge>
          {product.featured ? <Badge>Featured</Badge> : null}
        </div>
      </div>
    </Link>
  );
}
