import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { finalizeSifaloReturn } from "@/lib/server/checkout";
import { getPublicOrder } from "@/lib/server/orders";
import { formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/pay/success/$orderRef")({
  loader: ({ params }) => getPublicOrder({ data: params.orderRef }),
  component: PaySuccess,
});

const POLL_MS = 5_000;
const POLL_ATTEMPTS = 24; // ~2 minutes

function PaySuccess() {
  const initial = Route.useLoaderData();
  const { orderRef } = Route.useParams();
  const [data, setData] = useState(initial);
  const [checking, setChecking] = useState(false);

  async function recheck() {
    setChecking(true);
    try {
      await finalizeSifaloReturn({ data: { orderId: orderRef } });
      const next = await getPublicOrder({ data: orderRef });
      setData(next);
    } catch {
      /* stays pending — the visitor can retry, or the next poll tick will */
    } finally {
      setChecking(false);
    }
  }

  const statusRef = useRef(data?.order.status);
  statusRef.current = data?.order.status;
  useEffect(() => {
    if (statusRef.current !== "pending") return;
    let attempts = 0;
    const interval = window.setInterval(() => {
      attempts += 1;
      if (attempts > POLL_ATTEMPTS || statusRef.current !== "pending") {
        window.clearInterval(interval);
        return;
      }
      void recheck();
    }, POLL_MS);
    return () => window.clearInterval(interval);
    // `recheck` is recreated each render but its identity doesn't matter
    // here — this effect only needs to (re)start the poll loop when the
    // order ref changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderRef]);

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-bg px-4">
        <p className="text-sm text-muted">Order not found.</p>
      </main>
    );
  }
  const { order, delivery, shop, productUrl } = data;
  const paid = order.status === "paid";
  const pending = order.status === "pending";
  const shopHref = shop ? `/${shop.username}` : "/";
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-content-center px-4 py-16">
      <Logo />
      <h1 className="mt-8 font-display text-4xl tracking-tight text-fg">
        {paid ? "You are in." : pending ? "Payment pending" : "Payment did not go through"}
      </h1>
      <p className="mt-3 text-sm text-muted">
        {paid
          ? "Sifalo Pay confirmed this order. Delivery details are below."
          : pending
            ? "Still waiting on confirmation from Sifalo Pay — this page checks automatically."
            : "If you were charged, wait a moment and check again, or contact the seller with your order reference."}
      </p>
      <Card className="mt-8 p-5">
        <p className="text-xs uppercase tracking-[0.12em] text-muted">Order</p>
        <p className="mt-1 font-medium text-fg">{order.productTitle}</p>
        <p className="mt-1 font-mono text-xs text-muted">{order.orderRef}</p>
        <p className="mt-3 tabular-nums text-sm font-semibold text-fg">
          {formatPrice(order.amount, order.currency)}
        </p>
      </Card>
      {!paid ? (
        <Button className="mt-4 w-full" variant="secondary" disabled={checking} onClick={() => void recheck()}>
          {checking ? "Checking…" : "Check again"}
        </Button>
      ) : null}
      {paid && data.readUrl ? (
        <Button asChild className="mt-4 w-full">
          <a href={data.readUrl}>Read the article</a>
        </Button>
      ) : null}
      {paid && delivery && (delivery.note || delivery.url || delivery.files.length > 0) ? (
        <Card className="mt-4 p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-muted">Delivery</p>
          {delivery.note ? <p className="mt-2 text-sm leading-relaxed text-fg">{delivery.note}</p> : null}
          {delivery.files.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {delivery.files.map((file) => (
                <li key={file.url}>
                  <Button asChild className="w-full">
                    <a href={file.url}>Download {file.name}</a>
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
          {delivery.url ? (
            <Button asChild variant={delivery.files.length ? "secondary" : "primary"} className="mt-4 w-full">
              <a href={delivery.url} target="_blank" rel="noreferrer">
                Open delivery
              </a>
            </Button>
          ) : null}
        </Card>
      ) : null}
      <Button asChild variant="ghost" className="mt-6">
        <a href={productUrl ?? shopHref}>{shop ? `Back to ${shop.displayName}` : "Back to Kart"}</a>
      </Button>
    </main>
  );
}
