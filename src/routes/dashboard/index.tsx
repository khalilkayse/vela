import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CreditCard, Package, Copy, Check, Wallet } from "lucide-react";
import { DashboardPage, useShop } from "@/components/dashboard-shell";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboardStats, listMyOrders } from "@/lib/server/orders";
import type { DashboardStats, Order } from "@/lib/types";
import { OrderBadge } from "@/components/order-badge";
import { errMsg } from "@/lib/errors";
import { formatPrice } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { authClient } from "@/lib/auth/client";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/")({ component: DashboardHome });

function DashboardHome() {
  const { shop } = useShop();
  const { user } = useCurrentUserState();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const pageUrl = typeof window !== "undefined" ? `${window.location.origin}/${shop.username}` : `/${shop.username}`;

  function loadOrders() {
    setOrdersError(null);
    listMyOrders()
      .then(setOrders)
      .catch((error) => setOrdersError(errMsg(error)));
  }

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(() => setStats({ revenue: 0, fees: 0, earnings: 0, balance: 0, orderCount: 0, paidCount: 0, productCount: 0 }));
    loadOrders();
  }, []);

  return (
    <DashboardPage
      title="Home"
      description="A quiet overview of your shop, payouts, and recent orders."
    >
      {user && !user.emailVerified ? (
        <Card className="mb-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-fg">Confirm your email</p>
            <p className="mt-1 text-sm text-muted">
              We sent a link to {user.primaryEmail}. Confirm it so we can email receipts and welcome notes.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              void authClient.sendVerificationEmail({ email: user.primaryEmail ?? "" }).then((result) => {
                if (result.error) toast.error(result.error.message);
                else toast.success("Confirmation email sent.");
              });
            }}
          >
            Resend
          </Button>
        </Card>
      ) : null}

      <Card className="mb-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-fg">Your public page</p>
          <p className="mt-1 truncate font-mono text-sm text-muted">{pageUrl}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" asChild>
            <Link to="/$username" params={{ username: shop.username }}>
              View
            </Link>
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              void navigator.clipboard.writeText(pageUrl).then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1600);
              });
            }}
          >
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>
      </Card>

      {!shop.checkoutLive ? (
        <Card className="mb-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-fg">Checkout isn't open yet</p>
            <p className="mt-1 text-sm text-muted">
              Kart hasn't finished setting up payments on this instance. Free items and links still
              work — paid checkout will turn on automatically once it's ready.
            </p>
          </div>
        </Card>
      ) : shop.testMode ? (
        <Card className="mb-6 flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-warn/10 text-warn">
              <CreditCard className="size-4" />
            </span>
            <div>
              <p className="font-semibold text-fg">Test mode</p>
              <p className="text-sm text-muted">Checkout is running in Sifalo Pay sandbox — no real money moves.</p>
            </div>
          </div>
          <Badge tone="warn">Test</Badge>
        </Card>
      ) : (
        <Card className="mb-6 flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-success/10 text-success">
              <CreditCard className="size-4" />
            </span>
            <div>
              <p className="font-semibold text-fg">Live checkout</p>
              <p className="text-sm text-muted">Buyers pay through Sifalo Pay. Add your payout details in settings.</p>
            </div>
          </div>
          <Badge tone="success">Live</Badge>
        </Card>
      )}

      {!shop.payoutAccount ? (
        <Card className="mb-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-fg">Add your payout details</p>
            <p className="mt-1 text-sm text-muted">
              Tell Kart where to send what you earn — a mobile wallet or bank account.
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link to="/dashboard/settings">
              <Wallet />
              Add payout details
            </Link>
          </Button>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Sales" value={stats ? formatPrice(stats.revenue) : null} />
        <Stat label="Kart fee" value={stats ? formatPrice(stats.fees) : null} />
        <Stat label="Earnings" value={stats ? formatPrice(stats.earnings) : null} />
        <Stat label="Balance owed to you" value={stats ? formatPrice(stats.balance) : null} />
      </div>

      <div className="mt-10 flex items-end justify-between">
        <h2 className="text-base font-semibold text-fg">Recent orders</h2>
        <Link to="/dashboard/orders" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
          All orders <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <div className="mt-4">
        {ordersError ? (
          <ErrorState message={ordersError} onRetry={loadOrders} />
        ) : orders === null ? (
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
