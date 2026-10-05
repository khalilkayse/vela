import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { toast } from "sonner";
import { AdminPage } from "@/components/dashx-shell";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderBadge } from "@/components/order-badge";
import { listPlatformOrders, recheckOrderPayment } from "@/lib/server/admin";
import { errMsg } from "@/lib/errors";
import { formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/dashx/orders")({ component: AdminOrders });

function AdminOrders() {
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof listPlatformOrders>> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rechecking, setRechecking] = useState<string | null>(null);

  function load() {
    setLoadError(null);
    listPlatformOrders()
      .then(setOrders)
      .catch((error) => setLoadError(errMsg(error)));
  }

  useEffect(load, []);

  async function onRecheck(orderRef: string) {
    setRechecking(orderRef);
    try {
      const order = await recheckOrderPayment({ data: orderRef });
      toast.success(order.status === "paid" ? "Payment confirmed." : `Still ${order.status}.`);
      load();
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setRechecking(null);
    }
  }

  return (
    <AdminPage title="Orders" description="Checkout across every shop.">
      {loadError ? (
        <ErrorState message={loadError} onRetry={load} />
      ) : orders === null ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : orders.length === 0 ? (
        <EmptyState title="No orders" body="Paid checkouts from every merchant will land here." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Order</th>
                <th className="px-5 py-3 font-medium">Shop</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Fee</th>
                <th className="px-5 py-3 font-medium">Net</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-5 py-4">
                    <p className="font-medium text-fg">{order.productTitle}</p>
                    <p className="font-mono text-xs text-muted">{order.orderRef}</p>
                  </td>
                  <td className="px-5 py-4">
                    {order.shopUsername ? (
                      <Link
                        to="/$username"
                        params={{ username: order.shopUsername }}
                        className="font-medium text-primary hover:underline"
                      >
                        /{order.shopUsername}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-fg">{order.customerName}</p>
                    <p className="text-xs text-muted">{order.customerEmail}</p>
                  </td>
                  <td className="px-5 py-4 tabular-nums font-medium text-fg">
                    {formatPrice(order.amount, order.currency)}
                  </td>
                  <td className="px-5 py-4 tabular-nums text-muted">
                    {formatPrice(order.feeAmount, order.currency)}
                  </td>
                  <td className="px-5 py-4 tabular-nums text-muted">
                    {formatPrice(order.netAmount, order.currency)}
                  </td>
                  <td className="px-5 py-4">
                    <OrderBadge order={order} />
                  </td>
                  <td className="px-5 py-4 text-muted">
                    {order.createdAt ? format(new Date(order.createdAt), "d MMM yyyy, HH:mm") : "—"}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {order.status === "pending" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={rechecking === order.orderRef}
                        onClick={() => void onRecheck(order.orderRef)}
                      >
                        {rechecking === order.orderRef ? "Checking…" : "Re-check payment"}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </AdminPage>
  );
}
