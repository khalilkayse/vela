import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { toast } from "sonner";
import { DashboardPage } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderBadge } from "@/components/order-badge";
import { fulfillOrder, listMyOrders } from "@/lib/server/orders";
import type { Order } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { errMsg } from "@/lib/errors";

export const Route = createFileRoute("/dashboard/orders")({ component: OrdersPage });

function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  async function reload() {
    setOrders(await listMyOrders());
  }

  useEffect(() => {
    reload().catch(() => setOrders([]));
  }, []);

  async function onFulfill(order: Order) {
    setBusy(order.id);
    try {
      await fulfillOrder({ data: { orderId: order.id } });
      toast.success("Marked as fulfilled.");
      await reload();
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <DashboardPage
      title="Orders"
      description="Every checkout — mark services as fulfilled when you have delivered them."
    >
      {orders === null ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No orders"
          body="Share your shop page. When a buyer completes checkout, the order appears here with their email and delivery status."
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Order</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Fulfillment</th>
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
                  <td className="px-5 py-4">
                    {order.status !== "paid" ? (
                      <span className="text-xs text-muted">—</span>
                    ) : order.fulfilled ? (
                      <Badge tone="success">Fulfilled</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy === order.id}
                        onClick={() => void onFulfill(order)}
                      >
                        {busy === order.id ? "Saving…" : "Mark fulfilled"}
                      </Button>
                    )}
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
