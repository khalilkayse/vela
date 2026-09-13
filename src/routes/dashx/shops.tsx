import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AdminPage } from "@/components/dashx-shell";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  clearShopSifalo,
  listPlatformShops,
  setShopAllowOwnSifalo,
  setShopPublished,
  type AdminShop,
} from "@/lib/server/admin";
import { formatCountry } from "@/lib/geo";
import { errMsg } from "@/lib/errors";

export const Route = createFileRoute("/dashx/shops")({ component: AdminShops });

function AdminShops() {
  const [shops, setShops] = useState<AdminShop[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function reload() {
    setShops(await listPlatformShops());
  }

  useEffect(() => {
    reload().catch(() => setShops([]));
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
      description="Unpublish a storefront, grant a shop its own Sifalo Pay keys while the platform still collects for everyone else, or clear saved keys."
    >
      {shops === null ? (
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
                    {shop.hasSifaloCredentials ? (
                      <Badge tone={shop.sifaloConnected ? "primary" : "warn"}>Own keys</Badge>
                    ) : null}
                    {shop.allowOwnSifalo ? <Badge tone="primary">May use own Sifalo</Badge> : null}
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
              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                <Button
                  variant={shop.allowOwnSifalo ? "secondary" : "ghost"}
                  size="sm"
                  disabled={busy === `own-${shop.id}`}
                  onClick={() =>
                    void run(`own-${shop.id}`, async () => {
                      await setShopAllowOwnSifalo({
                        data: { shopId: shop.id, allow: !shop.allowOwnSifalo },
                      });
                      toast.success(
                        shop.allowOwnSifalo
                          ? "This shop will use platform credentials when platform-wide collection is on."
                          : "This shop may connect its own Sifalo Pay keys.",
                      );
                    })
                  }
                >
                  {shop.allowOwnSifalo ? "Revoke own keys" : "Allow own Sifalo keys"}
                </Button>
                {shop.hasSifaloCredentials ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy === `clr-${shop.id}`}
                    onClick={() =>
                      void run(`clr-${shop.id}`, async () => {
                        await clearShopSifalo({ data: shop.id });
                        toast.success("Shop Sifalo keys cleared.");
                      })
                    }
                  >
                    Clear keys
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </AdminPage>
  );
}
