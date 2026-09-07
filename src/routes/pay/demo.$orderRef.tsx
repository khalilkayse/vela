import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { errMsg } from "@/lib/errors";
import { completeDemoPayment } from "@/lib/server/checkout";
import { getPublicOrder } from "@/lib/server/orders";
import { formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/pay/demo/$orderRef")({
  loader: ({ params }) => getPublicOrder({ data: params.orderRef }),
  component: DemoPay,
});

function DemoPay() {
  const data = Route.useLoaderData();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-bg px-4">
        <p className="text-sm text-muted">Order not found.</p>
      </main>
    );
  }
  const { order } = data;

  async function confirm() {
    setBusy(true);
    try {
      await completeDemoPayment({ data: order.orderRef });
      await navigate({ to: "/pay/success/$orderRef", params: { orderRef: order.orderRef } });
    } catch (error) {
      toast.error(errMsg(error));
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-md place-content-center px-4 py-16">
      <Logo />
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Demo checkout</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight text-fg">Sifalo Pay is not connected yet</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        This merchant has not added Sifalo Pay API credentials. Confirm below to preview the success
        and delivery flow. No real charge is made.
      </p>
      <Card className="mt-8 p-5">
        <p className="font-medium text-fg">{order.productTitle}</p>
        <p className="mt-1 tabular-nums text-sm text-muted">
          {formatPrice(order.amount, order.currency)} · {order.customerEmail}
        </p>
      </Card>
      <Button className="mt-6 w-full" size="lg" disabled={busy} onClick={confirm}>
        {busy ? "Confirming…" : "Simulate successful payment"}
      </Button>
    </main>
  );
}
