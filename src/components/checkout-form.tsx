import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { startCheckout } from "@/lib/server/checkout";
import type { Product, Shop } from "@/lib/types";
import { errMsg } from "@/lib/errors";
import { formatPrice } from "@/lib/utils";

export function CheckoutForm({ product, shop }: { product: Product; shop: Shop }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const isFree = product.kind === "link" || product.price <= 0;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await startCheckout({
        data: {
          productId: product.id,
          name,
          email,
          origin: window.location.origin,
        },
      });
      window.location.href = result.redirectUrl;
    } catch (error) {
      toast.error(errMsg(error));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Your name">
        <Input
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Amina Hassan"
        />
      </Field>
      <Field label="Email" hint="Receipt and delivery land here.">
        <Input
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@studio.com"
        />
      </Field>
      <Button type="submit" className="w-full" size="lg" disabled={busy}>
        {busy
          ? "Preparing checkout…"
          : isFree
            ? product.buttonLabel || "Get it free"
            : `${product.buttonLabel || "Buy now"} · ${formatPrice(product.price, product.currency)}`}
      </Button>
      <p className="text-center text-xs leading-relaxed text-muted">
        {isFree
          ? "No payment required."
          : shop.hasSifaloCredentials
            ? `You will complete payment on Sifalo Pay. Funds go to ${shop.displayName}.`
            : "This shop has not connected Sifalo Pay yet. Checkout will run in demo mode so you can preview the flow."}
      </p>
    </form>
  );
}
