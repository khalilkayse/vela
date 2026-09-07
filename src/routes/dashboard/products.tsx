import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { DashboardPage } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/empty-state";
import { ProductCover } from "@/components/product-cover";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listMyProducts } from "@/lib/server/products";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/products")({ component: ProductsPage });

function ProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    listMyProducts().then(setProducts).catch(() => setProducts([]));
  }, []);

  return (
    <DashboardPage
      title="Products"
      description="Digital files, services, and free links. Each one can check out through Sifalo Pay."
      action={
        <Button asChild>
          <Link to="/dashboard/products/new">
            <Plus />
            Add product
          </Link>
        </Button>
      }
    >
      {products === null ? (
        <div className="grid gap-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title="Your catalog is empty"
          body="Add a digital product, a 1:1 service, or a free link. Covers and prices show on your public page."
          action={
            <Button asChild>
              <Link to="/dashboard/products/new">Add your first product</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {products.map((product) => (
            <li key={product.id}>
              <Link
                to="/dashboard/products/$id"
                params={{ id: String(product.id) }}
                className="flex gap-4 rounded-xl border border-border bg-surface p-3 shadow-soft transition-[transform] duration-150 hover:-translate-y-0.5 sm:p-4"
              >
                <ProductCover style={product.coverStyle} className="h-20 w-28 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1 py-0.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="truncate font-medium text-fg">{product.title}</p>
                    <p className="shrink-0 tabular-nums text-sm font-semibold text-fg">
                      {product.kind === "link" ? "Free" : formatPrice(product.price, product.currency)}
                    </p>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-muted">{product.description || "No description"}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone="primary">
                      {product.kind === "service" ? "Service" : product.kind === "link" ? "Link" : "Digital"}
                    </Badge>
                    {product.published ? <Badge tone="success">Live</Badge> : <Badge>Draft</Badge>}
                    {product.featured ? <Badge>Featured</Badge> : null}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardPage>
  );
}
