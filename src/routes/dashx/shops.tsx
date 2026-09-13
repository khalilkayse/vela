import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminPage } from "@/components/dashx-shell";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { listPlatformShops, setShopPublished, type AdminShop } from "@/lib/server/admin";

export const Route = createFileRoute("/dashx/shops")({ component: AdminShops });

function AdminShops() {
  const [shops, setShops] = useState<AdminShop[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  async function reload() {
    const next = await listPlatformShops();
    setShops(next);
  }

  useEffect(() => {
    reload().catch(() => setShops([]));
  }, []);

  async function toggle(shop: AdminShop) {
    setBusy(shop.id);
    try {
      await setShopPublished({ data: { shopId: shop.id, published: !shop.published } });
      await reload();
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminPage title="Shops" description="Unpublish a storefront to hide it from Discover and its public URL.">
      {shops === null ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : shops.length === 0 ? (
        <EmptyState title="No shops yet" body="When someone finishes onboarding, their studio will show up here." />
      ) : (
        <div className="space-y-3">
          {shops.map((shop) => (
            <Card key={shop.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-fg">{shop.displayName}</p>
                  <Badge tone={shop.published ? "success" : "neutral"}>
                    {shop.published ? "Live" : "Hidden"}
                  </Badge>
                  {shop.sifaloConnected ? <Badge tone="primary">Sifalo</Badge> : null}
                </div>
                <p className="mt-1 truncate text-sm text-muted">
                  /{shop.username}
                  {shop.ownerEmail ? ` · ${shop.ownerEmail}` : ""}
                </p>
                <p className="mt-1 text-xs text-subtle">
                  {shop.productCount} products · {shop.paidCount} paid
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" asChild>
                  <Link to="/$username" params={{ username: shop.username }}>
                    View
                  </Link>
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy === shop.id}
                  onClick={() => void toggle(shop)}
                >
                  {shop.published ? "Unpublish" : "Publish"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AdminPage>
  );
}
