import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { CheckoutForm } from "@/components/checkout-form";
import { ProductCover } from "@/components/product-cover";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/card";
import { getPublicProduct } from "@/lib/server/products";
import { formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/$username/$slug")({
  loader: async ({ params }) =>
    getPublicProduct({
      data: { username: params.username, slug: params.slug },
    }),
  component: ProductPage,
});

function ProductPage() {
  const data = Route.useLoaderData();
  if (!data) {
    return (
      <div className="min-h-screen bg-bg">
        <SiteHeader solid />
        <main className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="font-display text-3xl tracking-tight text-fg">Not listed</h1>
          <p className="mt-3 text-sm text-muted">This product is unpublished or does not exist.</p>
        </main>
      </div>
    );
  }
  const { shop, product } = data;
  return (
    <div className="min-h-screen bg-bg">
      <SiteHeader solid />
      <main className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-14">
        <div>
          <Link
            to="/$username"
            params={{ username: shop.username }}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg"
          >
            <ArrowLeft className="size-4" />
            {shop.displayName}
          </Link>
          <div className="mt-6 overflow-hidden rounded-xl border border-border shadow-soft">
            <ProductCover style={product.coverStyle} title={product.title} className="aspect-[16/10]" />
          </div>
        </div>
        <div>
          <Badge tone="primary">
            {product.kind === "service" ? "Service" : product.kind === "link" ? "Free" : "Digital product"}
          </Badge>
          <h1 className="mt-4 font-display text-4xl tracking-tight text-fg">{product.title}</h1>
          <p className="mt-3 font-display text-3xl tabular-nums text-fg">
            {product.kind === "link" ? "Free" : formatPrice(product.price, product.currency)}
          </p>
          {product.description ? (
            <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-muted">{product.description}</p>
          ) : null}
          <div className="mt-8 rounded-xl border border-border bg-surface p-5 shadow-soft">
            <CheckoutForm product={product} shop={shop} />
          </div>
        </div>
      </main>
    </div>
  );
}
