import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AdminPage } from "@/components/dashx-shell";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { listPlatformShops, setShopPublished, type AdminShop } from "@/lib/server/admin";
import { formatCountry } from "@/lib/geo";
import { formatPrice } from "@/lib/utils";
import { errMsg } from "@/lib/errors";

export const Route = createFileRoute("/dashx/shops")({ component: AdminShops });

function AdminShops() {
  const [shops, setShops] = useState<AdminShop[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function reload() {
    setLoadError(null);
    setShops(await listPlatformShops());
  }

  useEffect(() => {
    reload().catch((error) => setLoadError(errMsg(error)));
  }, []);

  async function run(key: string, work: () => Promise<unknown>) {
    setBusy(key);
    try {
      await work();
      await reload();
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminPage
      title="Shops"
      description="Unpublish a storefront, or see what's owed before recording a payout under Payouts."
    >
      {loadError ? (
        <ErrorState message={loadError} onRetry={() => void reload().catch((error) => setLoadError(errMsg(error)))} />
      ) : shops === null ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : shops.length === 0 ? (
        <EmptyState title="No shops yet" body="When someone finishes onboarding, their studio will show up here." />
      ) : (
        <div className="space-y-3">
          {shops.map((shop) => (
            <Card key={shop.id} className="flex flex-col gap-4 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-fg">{shop.displayName}</p>
                    <Badge tone={shop.published ? "success" : "neutral"}>
                      {shop.published ? "Live" : "Hidden"}
                    </Badge>
                    {shop.balanceOwed > 0 ? (
                      <Badge tone="warn">{formatPrice(shop.balanceOwed)} owed</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted">
                    /{shop.username}
                    {shop.ownerEmail ? ` · ${shop.ownerEmail}` : ""}
                    {shop.country ? ` · ${formatCountry(shop.country)}` : ""}
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
                    disabled={busy === `pub-${shop.id}`}
                    onClick={() =>
                      void run(`pub-${shop.id}`, () =>
                        setShopPublished({ data: { shopId: shop.id, published: !shop.published } }),
                      )
                    }
                  >
                    {shop.published ? "Unpublish" : "Publish"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AdminPage>
  );
}
