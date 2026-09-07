import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Storefront } from "@/components/storefront";
import { Button } from "@/components/ui/button";
import { getPublicShop } from "@/lib/server/shops";
import { RESERVED_USERNAMES } from "@/lib/constants";

export const Route = createFileRoute("/$username/")({
  loader: async ({ params }) => {
    const username = params.username.toLowerCase();
    if (RESERVED_USERNAMES.has(username)) return null;
    return getPublicShop({ data: username });
  },
  component: PublicShopPage,
});

function PublicShopPage() {
  const data = Route.useLoaderData();
  if (!data) {
    return (
      <div className="min-h-screen bg-bg">
        <SiteHeader solid />
        <main className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="font-display text-3xl tracking-tight text-fg">This shop is not live</h1>
          <p className="mt-3 text-sm text-muted">
            The page may be unpublished, or the username is free. Claim it and start selling.
          </p>
          <Button asChild className="mt-6">
            <Link to="/login" search={{ next: "/onboarding" }}>
              Start selling
            </Link>
          </Button>
        </main>
      </div>
    );
  }
  return <Storefront shop={data.shop} products={data.products} blocks={data.blocks} />;
}
