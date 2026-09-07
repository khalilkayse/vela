import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CreditCard, Package } from "lucide-react";
import { DashboardPage, useShop } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/empty-state";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboardStats, listMyOrders } from "@/lib/server/orders";
import type { DashboardStats, Order } from "@/lib/types";
import { OrderBadge } from "@/components/order-badge";
import { formatPrice } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/dashboard/")({ component: DashboardHome });

function DashboardHome() {
  const { shop } = useShop();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    getDashboardStats().then(setStats).catch(() => setStats({ revenue: 0, orderCount: 0, paidCount: 0, productCount: 0 }));
    listMyOrders().then(setOrders).catch(() => setOrders([]));
  }, []);

  return (
    <DashboardPage
      title="Home"
      description="A quiet overview of your shop, payouts, and recent orders."
    >
      {!shop.hasSifaloCredentials ? (
        <Card className="mb-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-fg">Connect Sifalo Pay</p>
            <p className="mt-1 text-sm text-muted">
              Checkout stays in demo until you add your API username and password.
            </p>
          </div>
          <Button asChild>
            <Link to="/dashboard/settings">
              <CreditCard />
              Open settings
            </Link>
          </Button>
        </Card>
      ) : (
        <Card className="mb-6 flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-success/10 text-success">
              <CreditCard className="size-4" />
            </span>
            <div>
              <p className="font-semibold text-fg">Sifalo Pay connected</p>
              <p className="text-sm text-muted">Live checkout uses your merchant credentials.</p>
            </div>
          </div>
          <Badge tone="success">Live</Badge>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Revenue" value={stats ? formatPrice(stats.revenue) : null} />
        <Stat label="Paid orders" value={stats ? String(stats.paidCount) : null} />
        <Stat label="Products" value={stats ? String(stats.productCount) : null} />
      </div>

      <div className="mt-10 flex items-end justify-between">
        <h2 className="text-base font-semibold text-fg">Recent orders</h2>
        <Link to="/dashboard/orders" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
          All orders <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <div className="mt-4">
        {orders === null ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            body="When someone buys from your page, the order will land here with the Sifalo Pay status."
            action={
              <Button asChild variant="secondary">
                <Link to="/dashboard/products">
                  <Package />
                  Add a product
                </Link>
              </Button>
            }
          />
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-border">
              {orders.slice(0, 6).map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">{order.productTitle}</p>
                    <p className="truncate text-xs text-muted">
                      {order.customerName} · {order.orderRef}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular-nums text-sm font-semibold text-fg">
                      {formatPrice(order.amount, order.currency)}
                    </p>
                    <div className="mt-1 flex items-center justify-end gap-2">
                      <OrderBadge order={order} />
                      {order.createdAt ? (
                        <span className="text-xs text-subtle">
                          {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </DashboardPage>
  );
}

function Stat({ label, value }: { label: string; value: string | null }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">{label}</p>
      {value === null ? (
        <Skeleton className="mt-3 h-8 w-24" />
      ) : (
        <p className="mt-2 font-display text-3xl tabular-nums tracking-tight text-fg">{value}</p>
      )}
    </Card>
  );
}
