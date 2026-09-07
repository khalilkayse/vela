import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { DashboardPage } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderBadge } from "@/components/order-badge";
import { listMyOrders } from "@/lib/server/orders";
import type { Order } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/orders")({ component: OrdersPage });

function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    listMyOrders().then(setOrders).catch(() => setOrders([]));
  }, []);

  return (
    <DashboardPage
      title="Orders"
      description="Every checkout attempt, including demo payments and Sifalo Pay verifications."
    >
      {orders === null ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No orders"
          body="Share your shop page. When a buyer completes Sifalo Pay checkout, the order appears here."
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Order</th>
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
                    {order.sifaloSid ? (
                      <p className="text-xs text-subtle">sid {order.sifaloSid}</p>
                    ) : null}
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-fg">{order.customerName}</p>
                    <p className="text-xs text-muted">{order.customerEmail}</p>
                  </td>
                  <td className="px-5 py-4 tabular-nums font-medium text-fg">
                    {formatPrice(order.amount, order.currency)}
                    {order.paymentType ? (
                      <span className="mt-0.5 block text-xs font-normal text-muted">{order.paymentType}</span>
                    ) : null}
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
    </DashboardPage>
  );
}
