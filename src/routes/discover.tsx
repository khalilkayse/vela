import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { listPublishedShops } from "@/lib/server/shops";

export const Route = createFileRoute("/discover")({
  loader: () => listPublishedShops(),
  component: Discover,
});

function Discover() {
  const shops = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-bg">
      <SiteHeader solid />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Discover</p>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-fg">Studios on Vela</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Public shops published by makers using Sifalo Pay for checkout.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((shop) => (
            <Link
              key={shop.id}
              to="/$username"
              params={{ username: shop.username }}
              className="rounded-xl border border-border bg-surface p-5 shadow-soft transition-[transform] duration-150 hover:-translate-y-0.5"
            >
              <span className="grid size-12 place-items-center rounded-lg bg-primary font-display text-primary-fg">
                {shop.avatarInitials}
              </span>
              <p className="mt-4 font-semibold text-fg">{shop.displayName}</p>
              <p className="mt-1 text-sm text-muted">{shop.tagline || `/${shop.username}`}</p>
            </Link>
          ))}
        </div>
        {shops.length === 0 ? (
          <p className="mt-12 text-sm text-muted">No public shops yet.</p>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
