import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { CoverPicker, ProductCover } from "@/components/product-cover";
import { ProductFiles } from "@/components/product-files";
import { ImageWell } from "@/components/image-well";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/skeleton";
import { PRODUCT_KINDS, type ProductKind } from "@/lib/constants";
import { errMsg } from "@/lib/errors";
import { deleteProduct, upsertProduct } from "@/lib/server/products";
import { removeProductFile } from "@/lib/server/files";
import { uploadMedia } from "@/lib/upload";
import type { Product, ProductImage } from "@/lib/types";
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
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [published, setPublished] = useState(product?.published ?? true);
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [coverUrl, setCoverUrl] = useState(product?.coverUrl ?? null);
  const [gallery, setGallery] = useState<ProductImage[]>(product?.gallery ?? []);
  const [pendingCover, setPendingCover] = useState<File | null>(null);
  const [pendingGallery, setPendingGallery] = useState<{ file: File; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function uploadPending(productId: number) {
    if (pendingCover) {
      const uploaded = await uploadMedia(pendingCover, { productId, kind: "cover" });
      setCoverUrl(uploaded.url);
      setPendingCover(null);
    }
    if (pendingGallery.length > 0) {
      const added: ProductImage[] = [];
      for (const item of pendingGallery) {
        const uploaded = await uploadMedia(item.file, { productId, kind: "gallery" });
        added.push({ id: uploaded.id, url: uploaded.url });
      }
      setGallery((current) => [...current, ...added]);
      setPendingGallery([]);
    }
  }

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
          slug: slug || undefined,
        },
      });
      if (pendingCover || pendingGallery.length > 0) {
        setUploading(true);
        await uploadPending(saved.id);
      }
      toast.success(product ? "Product saved." : "Product created.");
      if (!product) {
        await navigate({ to: "/dashboard/products/$id", params: { id: String(saved.id) } });
      }
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setBusy(false);
      setUploading(false);
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

  async function onCoverFile(file: File) {
    if (!product) {
      setPendingCover(file);
      setCoverUrl(URL.createObjectURL(file));
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadMedia(file, { productId: product.id, kind: "cover" });
      setCoverUrl(uploaded.url);
      toast.success("Cover updated.");
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setUploading(false);
    }
  }

  async function onGalleryFile(file: File) {
    if (!product) {
      setPendingGallery((current) => [...current, { file, url: URL.createObjectURL(file) }]);
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadMedia(file, { productId: product.id, kind: "gallery" });
      setGallery((current) => [...current, { id: uploaded.id, url: uploaded.url }]);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setUploading(false);
    }
  }

  async function clearCover() {
    if (!product) {
      setPendingCover(null);
      setCoverUrl(null);
      return;
    }
    if (!product.coverFileId) {
      setCoverUrl(null);
      return;
    }
    try {
      await removeProductFile({ data: product.coverFileId });
      setCoverUrl(null);
    } catch (error) {
      toast.error(errMsg(error));
    }
  }

  async function removeGallery(image: ProductImage) {
    try {
      await removeProductFile({ data: image.id });
      setGallery((current) => current.filter((item) => item.id !== image.id));
    } catch (error) {
      toast.error(errMsg(error));
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <div className="space-y-5 rounded-xl border border-border bg-surface p-5 shadow-soft sm:p-6">
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} />
        </Field>
        <Field label="Description" hint="What they get, who it is for, and how you deliver it.">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={4000}
            placeholder="A brand kit with logo files, colour tokens, and a one-page guide."
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
        {product ? (
          <Field label="URL slug" hint={`Shown as /your-shop/${slug || "item"}`}>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} maxLength={48} />
          </Field>
        ) : null}

        <div className="border-t border-border pt-5">
          <p className="text-sm font-medium text-fg">Images</p>
          <p className="mt-1 text-xs text-muted">
            A thumbnail for the catalog, plus extra photos on the product page. JPG, PNG, or WebP, 4 MB each.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
            <ImageWell
              label="Thumbnail"
              url={coverUrl}
              onFile={onCoverFile}
              onClear={coverUrl ? () => void clearCover() : undefined}
              busy={uploading}
            />
            <div className="min-w-[10rem]">
              <p className="mb-2 text-sm font-medium text-fg">Fallback colour</p>
              <CoverPicker value={coverStyle} onChange={setCoverStyle} />
              <p className="mt-2 text-xs text-muted">Used when there is no photo.</p>
            </div>
          </div>
          <div className="mt-5">
            <p className="mb-2 text-sm font-medium text-fg">Gallery</p>
            <div className="flex flex-wrap gap-3">
              {gallery.map((image) => (
                <div key={image.id} className="relative h-24 w-24 overflow-hidden rounded-lg border border-border">
                  <img src={image.url} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded-md bg-surface/90 px-1.5 py-0.5 text-[10px] font-medium text-fg"
                    onClick={() => void removeGallery(image)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              {pendingGallery.map((item, index) => (
                <div key={`p-${index}`} className="relative h-24 w-24 overflow-hidden rounded-lg border border-border">
                  <img src={item.url} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded-md bg-surface/90 px-1.5 py-0.5 text-[10px] font-medium text-fg"
                    onClick={() => setPendingGallery((current) => current.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <ImageWell label="" compact onFile={onGalleryFile} busy={uploading} />
            </div>
          </div>
        </div>

        <Field
          label="Delivery note"
          hint="Shown on the success page after payment. Calendar links, file access, next steps."
        >
          <Textarea
            value={deliveryNote}
            onChange={(e) => setDeliveryNote(e.target.value)}
            maxLength={2000}
          />
        </Field>
        <Field label="Delivery URL" hint="Optional download or booking link unlocked after payment.">
          <Input
            value={deliveryUrl}
            onChange={(e) => setDeliveryUrl(e.target.value)}
            placeholder="https://"
          />
        </Field>
        {product ? (
          <ProductFiles productId={product.id} />
        ) : (
          <p className="text-xs leading-relaxed text-muted">
            Save the product first, then you can attach private delivery files. Photos above can be added now.
          </p>
        )}
      </div>

      <aside className="space-y-5">
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
          <ProductCover
            style={coverStyle}
            imageUrl={coverUrl}
            title={title || "Preview"}
            className="aspect-[16/10]"
          />
          <div className="p-4">
            <p className="truncate font-medium text-fg">{title || "Untitled"}</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{description || "Description"}</p>
          </div>
        </div>
        <div className="space-y-4 rounded-xl border border-border bg-surface p-5 shadow-soft">
          <Switch checked={published} onCheckedChange={setPublished} label="Published" />
          <Switch checked={featured} onCheckedChange={setFeatured} label="Featured" />
        </div>
        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={busy || uploading}>
            {uploading ? "Uploading…" : busy ? "Saving…" : product ? "Save product" : "Create product"}
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
