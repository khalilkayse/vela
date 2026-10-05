import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Storefront } from "@/components/storefront";
import { Button } from "@/components/ui/button";
import { getPublicShop } from "@/lib/server/shops";
import { APP_NAME, RESERVED_USERNAMES } from "@/lib/constants";

export const Route = createFileRoute("/$username/")({
  loader: async ({ params }) => {
    const username = params.username.toLowerCase();
    if (RESERVED_USERNAMES.has(username)) return null;
    return getPublicShop({ data: username });
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { shop } = loaderData;
    const title = shop.displayName;
    const description = shop.tagline || `${shop.displayName} on ${APP_NAME}.`;
    const meta = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
    ];
    if (shop.avatarUrl) meta.push({ property: "og:image", content: shop.avatarUrl });
    return { meta };
  },
  component: PublicShopPage,
});

function PublicShopPage() {
  const data = Route.useLoaderData();
  const { username } = Route.useParams();
  if (!data) {
    // RESERVED_USERNAMES.has(username) means this path belongs to the app
    // itself (e.g. /pay, /api) — never a claimable shop username.
    const reserved = RESERVED_USERNAMES.has(username.toLowerCase());
    return (
      <div className="min-h-screen bg-bg">
        <SiteHeader solid />
        <main className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="font-display text-3xl tracking-tight text-fg">
            {reserved ? "Page not found" : "This shop is not live"}
          </h1>
          <p className="mt-3 text-sm text-muted">
            {reserved
              ? "There's no page at this address."
              : "The page may be unpublished, or the username is free. Claim it and start selling."}
          </p>
          {reserved ? null : (
            <Button asChild className="mt-6">
              <Link to="/login" search={{ next: "/onboarding" }}>
                Start selling
              </Link>
            </Button>
          )}
        </main>
      </div>
    );
  }
  return <Storefront shop={data.shop} products={data.products} blocks={data.blocks} />;
}
