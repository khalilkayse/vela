import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { AdminPage } from "@/components/dashx-shell";
import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderBadge } from "@/components/order-badge";
import { listPlatformOrders } from "@/lib/server/admin";
import { formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/dashx/orders")({ component: AdminOrders });

function AdminOrders() {
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof listPlatformOrders>> | null>(null);

  useEffect(() => {
    listPlatformOrders()
      .then(setOrders)
      .catch(() => setOrders([]));
  }, []);

  return (
    <AdminPage title="Orders" description="Checkout across every shop, including demo payments.">
      {orders === null ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : orders.length === 0 ? (
        <EmptyState title="No orders" body="Paid and demo checkouts from every merchant will land here." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Order</th>
                <th className="px-5 py-3 font-medium">Shop</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Date</th>
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
                  <td className="px-5 py-4">
                    <OrderBadge order={order} />
                  </td>
                  <td className="px-5 py-4 text-muted">
                    {order.createdAt ? format(new Date(order.createdAt), "d MMM yyyy, HH:mm") : "—"}
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
