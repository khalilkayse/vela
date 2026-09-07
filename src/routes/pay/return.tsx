import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/logo";
import { finalizeSifaloReturn } from "@/lib/server/checkout";
import { errMsg } from "@/lib/errors";

type Search = { order_id?: string; sid?: string };

export const Route = createFileRoute("/pay/return")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    order_id: typeof search.order_id === "string" ? search.order_id : undefined,
    sid: typeof search.sid === "string" ? search.sid : undefined,
  }),
  component: PayReturn,
});

function PayReturn() {
  const { order_id: orderId, sid } = Route.useSearch();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError("Missing order reference.");
      return;
    }
    let cancelled = false;
    finalizeSifaloReturn({ data: { orderId, sid } })
      .then((order) => {
        if (cancelled) return;
        void navigate({
          to: "/pay/success/$orderRef",
          params: { orderRef: order.orderRef },
        });
      })
      .catch((err) => {
        if (!cancelled) setError(errMsg(err));
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, sid, navigate]);

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4">
      <div className="max-w-sm text-center">
        <Logo className="justify-center" />
        <h1 className="mt-8 font-display text-3xl tracking-tight text-fg">
          {error ? "Could not verify payment" : "Confirming with Sifalo Pay"}
        </h1>
        <p className="mt-3 text-sm text-muted">
          {error ?? "Hold on — we are checking the transaction sid against the Sifalo Pay verify API."}
        </p>
      </div>
    </main>
  );
}
