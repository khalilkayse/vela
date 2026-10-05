import { useEffect } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Lock } from "lucide-react";
import { CheckoutForm } from "@/components/checkout-form";
import { ProductCover } from "@/components/product-cover";
import { RichHtml } from "@/components/rich-html";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { APP_NAME, kindLabel } from "@/lib/constants";
import { htmlToPlain } from "@/lib/html";
import { getPublicProduct } from "@/lib/server/products";
import { formatPrice } from "@/lib/utils";
import { readArticleAccess, writeArticleAccess } from "@/lib/article-access";

type ProductSearch = { access?: string };

export const Route = createFileRoute("/$username/$slug")({
  validateSearch: (search: Record<string, unknown>): ProductSearch => ({
    access: typeof search.access === "string" ? search.access : undefined,
  }),
  loaderDeps: ({ search }) => ({ access: search.access }),
  loader: async ({ params, deps }) =>
    getPublicProduct({
      data: { username: params.username, slug: params.slug, access: deps.access },
    }),
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { shop, product } = loaderData;
    const title = `${product.title} · ${shop.displayName}`;
    const description =
      htmlToPlain(product.description) || `${kindLabel(product.kind)} on ${shop.displayName}'s ${APP_NAME} page.`;
    const meta = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
    ];
    if (product.coverUrl) meta.push({ property: "og:image", content: product.coverUrl });
    return { meta };
  },
  component: ProductPage,
});

function ProductPage() {
  const data = Route.useLoaderData();
  const { access } = Route.useSearch();
  const navigate = useNavigate();
  const params = Route.useParams();

  // A paid article unlocked once (via the ?access= link from email or the
  // success page) should stay unlocked on this device when the buyer comes
  // back without that query param — e.g. from a bookmark or the storefront.
  useEffect(() => {
    if (!data) return;
    const { product } = data;
    if (product.kind !== "article" || !product.paywalled) return;
    if (access) {
      if (!product.locked) writeArticleAccess(params.username, params.slug, access);
      return;
    }
    const saved = readArticleAccess(params.username, params.slug);
    if (saved) {
      void navigate({
        to: "/$username/$slug",
        params,
        search: { access: saved },
        replace: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the loaded product or access param changes
  }, [data, access, params.username, params.slug]);

  if (!data) {
    return (
      <div className="min-h-screen bg-bg">
        <SiteHeader solid />
        <main className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="font-display text-3xl tracking-tight text-fg">Not listed</h1>
          <p className="mt-3 text-sm text-muted">This product is unpublished or does not exist.</p>
        </main>
      </div>
    );
  }
  const { shop, product } = data;
  const isArticle = product.kind === "article";
  const isLink = product.kind === "link";
  const isFree = isLink || product.price <= 0;
  const showCheckout = !isLink && (!isArticle || product.locked);

  return (
    <div className="min-h-screen bg-bg">
      <SiteHeader solid />
      <main
        className={
          isArticle && !product.locked
            ? "mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:py-14"
            : "mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-14"
        }
      >
        <div>
          <Link
            to="/$username"
            params={{ username: shop.username }}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg"
          >
            <ArrowLeft className="size-4" />
            {shop.displayName}
          </Link>
          {isArticle ? null : (
            <div className="mt-6 overflow-hidden rounded-xl border border-border shadow-soft">
              <ProductCover
                style={product.coverStyle}
                imageUrl={product.coverUrl}
                title={product.title}
                className="aspect-[16/10]"
              />
            </div>
          )}
          {product.gallery.length > 0 && !isArticle ? (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {product.gallery.map((image) => (
                <img
                  key={image.id}
                  src={image.url}
                  alt=""
                  className="aspect-square w-full rounded-lg object-cover"
                />
              ))}
            </div>
          ) : null}

          {isArticle ? (
            <article className="mt-8">
              <Badge tone="primary">{product.paywalled ? "Paid read" : "Article"}</Badge>
              <h1 className="mt-4 font-display text-4xl tracking-tight text-fg">{product.title}</h1>
              <p className="mt-3 font-display text-2xl tabular-nums text-fg">
                {isFree ? "Free to read" : formatPrice(product.price, product.currency)}
              </p>
              {product.coverUrl ? (
                <div className="mt-6 overflow-hidden rounded-xl border border-border">
                  <img src={product.coverUrl} alt="" className="aspect-[16/9] w-full object-cover" />
                </div>
              ) : null}
              {product.description ? (
                <div className="mt-6 text-base text-muted">
                  <RichHtml html={product.description} className="text-base leading-relaxed text-muted" />
                </div>
              ) : null}
              {product.locked ? (
                <div className="mt-8 rounded-xl border border-border bg-surface p-6 shadow-soft">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
                      <Lock className="size-4" />
                    </span>
                    <div>
                      <p className="font-semibold text-fg">This one is paid, read only</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted">
                        Pay once and the full article unlocks on this page. Nothing to download.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-8">
                  <RichHtml html={product.bodyHtml} className="text-base leading-relaxed" />
                </div>
              )}
            </article>
          ) : null}
        </div>
        <div className={isArticle && !product.locked ? "mt-10" : undefined}>
          {isArticle && !product.locked ? null : (
            <>
              {isArticle ? null : (
                <>
                  <Badge tone="primary">{kindLabel(product.kind)}</Badge>
                  <h1 className="mt-4 font-display text-4xl tracking-tight text-fg">{product.title}</h1>
                  <p className="mt-3 font-display text-3xl tabular-nums text-fg">
                    {isFree ? "Free" : formatPrice(product.price, product.currency)}
                  </p>
                  {product.description ? (
                    <div className="mt-5">
                      <RichHtml html={product.description} />
                    </div>
                  ) : null}
                </>
              )}
              {isLink ? (
                <div className="mt-8 rounded-xl border border-border bg-surface p-5 shadow-soft">
                  <Button asChild className="w-full" size="lg">
                    <a href={product.deliveryUrl ?? "#"} target="_blank" rel="noreferrer">
                      {product.buttonLabel || "Open"}
                      <ExternalLink />
                    </a>
                  </Button>
                  <p className="mt-3 text-center text-xs text-muted">Free. Opens in a new tab.</p>
                </div>
              ) : showCheckout ? (
                <div className="mt-8 rounded-xl border border-border bg-surface p-5 shadow-soft">
                  <CheckoutForm product={product} shop={shop} />
                </div>
              ) : null}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
