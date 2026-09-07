import { Link, createFileRoute } from "@tanstack/react-router";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getPublicOrder } from "@/lib/server/orders";
import { formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/pay/success/$orderRef")({
  loader: ({ params }) => getPublicOrder({ data: params.orderRef }),
  component: PaySuccess,
});

function PaySuccess() {
  const data = Route.useLoaderData();
  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-bg px-4">
        <p className="text-sm text-muted">Order not found.</p>
      </main>
    );
  }
  const { order, delivery } = data;
  const paid = order.status === "paid";
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-content-center px-4 py-16">
      <Logo />
      <h1 className="mt-8 font-display text-4xl tracking-tight text-fg">
        {paid ? "You are in." : order.status === "pending" ? "Payment pending" : "Payment did not go through"}
      </h1>
      <p className="mt-3 text-sm text-muted">
        {paid
          ? order.demo
            ? "This was a demo checkout — the merchant has not connected Sifalo Pay yet."
            : "Sifalo Pay confirmed this order. Delivery details are below."
          : "If you were charged, wait a moment and refresh, or contact the seller with your order reference."}
      </p>
      <Card className="mt-8 p-5">
        <p className="text-xs uppercase tracking-[0.12em] text-muted">Order</p>
        <p className="mt-1 font-medium text-fg">{order.productTitle}</p>
        <p className="mt-1 font-mono text-xs text-muted">{order.orderRef}</p>
        <p className="mt-3 tabular-nums text-sm font-semibold text-fg">
          {formatPrice(order.amount, order.currency)}
        </p>
      </Card>
      {paid && delivery ? (
        <Card className="mt-4 p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-muted">Delivery</p>
          {delivery.note ? <p className="mt-2 text-sm leading-relaxed text-fg">{delivery.note}</p> : null}
          {delivery.url ? (
            <Button asChild className="mt-4 w-full">
              <a href={delivery.url} target="_blank" rel="noreferrer">
                Open delivery
              </a>
            </Button>
          ) : null}
        </Card>
      ) : null}
      <Button asChild variant="ghost" className="mt-6">
        <Link to="/">Back to Vela</Link>
      </Button>
    </main>
  );
}
