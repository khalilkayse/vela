import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { CoverPicker } from "@/components/product-cover";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/skeleton";
import { PRODUCT_KINDS, type ProductKind } from "@/lib/constants";
import { errMsg } from "@/lib/errors";
import { deleteProduct, upsertProduct } from "@/lib/server/products";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductForm({ product }: { product?: Product }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(product?.title ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [kind, setKind] = useState<ProductKind>(product?.kind ?? "digital");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [coverStyle, setCoverStyle] = useState(product?.coverStyle ?? "mesh-1");
  const [buttonLabel, setButtonLabel] = useState(product?.buttonLabel ?? "Buy now");
  const [deliveryNote, setDeliveryNote] = useState(product?.deliveryNote ?? "");
  const [deliveryUrl, setDeliveryUrl] = useState(product?.deliveryUrl ?? "");
  const [published, setPublished] = useState(product?.published ?? true);
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const saved = await upsertProduct({
        data: {
          id: product?.id,
          title,
          description,
          kind,
          price: kind === "link" ? 0 : price,
          coverStyle,
          buttonLabel,
          deliveryNote,
          deliveryUrl,
          published,
          featured,
        },
      });
      toast.success(product ? "Product saved." : "Product created.");
      if (!product) {
        await navigate({ to: "/dashboard/products/$id", params: { id: String(saved.id) } });
      }
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!product) return;
    if (!window.confirm("Delete this product? Existing orders keep the title.")) return;
    setRemoving(true);
    try {
      await deleteProduct({ data: product.id });
      toast.success("Product deleted.");
      await navigate({ to: "/dashboard/products" });
    } catch (error) {
      toast.error(errMsg(error));
      setRemoving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <div className="space-y-5 rounded-xl border border-border bg-surface p-5 shadow-soft sm:p-6">
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} />
        </Field>
        <Field label="Description">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            placeholder="What they get, who it is for, and how you deliver it."
          />
        </Field>
        <div>
          <p className="mb-2 text-sm font-medium text-fg">Type</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {PRODUCT_KINDS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setKind(option.id)}
                className={cn(
                  "rounded-lg border px-3 py-3 text-left transition-colors duration-150",
                  kind === option.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-surface hover:bg-bg",
                )}
              >
                <span className="block text-sm font-medium text-fg">{option.label}</span>
                <span className="mt-0.5 block text-xs text-muted">{option.hint}</span>
              </button>
            ))}
          </div>
        </div>
        {kind !== "link" ? (
          <Field label="Price (USD)">
            <Input
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="29"
              required
            />
          </Field>
        ) : null}
        <Field label="Button label">
          <Input value={buttonLabel} onChange={(e) => setButtonLabel(e.target.value)} maxLength={32} />
        </Field>
        <Field
          label="Delivery note"
          hint="Shown on the success page after payment. Calendar links, file access, next steps."
        >
          <Textarea
            value={deliveryNote}
            onChange={(e) => setDeliveryNote(e.target.value)}
            maxLength={400}
          />
        </Field>
        <Field label="Delivery URL" hint="Optional download or booking link unlocked after payment.">
          <Input
            value={deliveryUrl}
            onChange={(e) => setDeliveryUrl(e.target.value)}
            placeholder="https://"
          />
        </Field>
      </div>

      <aside className="space-y-5">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
          <p className="mb-3 text-sm font-medium text-fg">Cover</p>
          <CoverPicker value={coverStyle} onChange={setCoverStyle} />
        </div>
        <div className="space-y-4 rounded-xl border border-border bg-surface p-5 shadow-soft">
          <Switch checked={published} onCheckedChange={setPublished} label="Published" />
          <Switch checked={featured} onCheckedChange={setFeatured} label="Featured" />
        </div>
        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : product ? "Save product" : "Create product"}
          </Button>
          {product ? (
            <Button type="button" variant="ghost" disabled={removing} onClick={onDelete}>
              {removing ? "Deleting…" : "Delete"}
            </Button>
          ) : null}
        </div>
      </aside>
    </form>
  );
}
