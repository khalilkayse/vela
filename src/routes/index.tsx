import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CreditCard, LayoutPanelTop, Link2, Store } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ProductCover } from "@/components/product-cover";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="min-h-screen bg-bg">
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:pb-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rise">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Built for Sifalo Pay
              </p>
              <h1 className="mt-4 font-display text-5xl leading-[1.05] tracking-tight text-fg sm:text-6xl">
                Sell digital work from a page that feels like yours.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
                Vela is a storefront for products, services, and links. Pick a username,
                design your page, and connect your Sifalo Pay account. Checkout is theirs.
                The catalog is yours.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link to="/login" search={{ next: "/onboarding" }}>
                    Start selling
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link to="/$username" params={{ username: "maya" }}>
                    View a live shop
                  </Link>
                </Button>
              </div>
              <p className="mt-4 text-sm text-subtle">No platform fees. Payouts go to your Sifalo Pay account.</p>
            </div>
            <HeroPreview />
          </div>
        </section>

        <section className="border-y border-border bg-surface">
          <div className="mx-auto grid max-w-6xl gap-px bg-border sm:grid-cols-3">
            <Feature
              icon={Store}
              title="Shop pages"
              body="A catalog-first storefront. Covers, prices, and a checkout that belongs to each merchant."
            />
            <Feature
              icon={Link2}
              title="Link pages"
              body="Stacked buttons for the people who just need a calm home on the internet."
            />
            <Feature
              icon={LayoutPanelTop}
              title="Studio layout"
              body="Profile, links, then products — organized like Stan, clearer like Shopify."
            />
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">How it works</p>
            <h2 className="mt-3 font-display text-4xl tracking-tight text-fg">
              Three steps from username to paid order.
            </h2>
          </div>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            <Step n="01" title="Claim your page" body="Choose a username. Set a layout. Publish a catalog of files, sessions, or free links." />
            <Step n="02" title="Connect Sifalo Pay" body="Paste your API username and password in Settings. We initiate checkout with your credentials, never ours." />
            <Step n="03" title="Get paid" body="Buyers land on Sifalo Pay, pay, and return. Vela verifies the sid and unlocks delivery." />
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="overflow-hidden rounded-xl border border-border bg-primary px-6 py-10 text-primary-fg sm:px-10 sm:py-14">
            <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
              <div>
                <h2 className="font-display text-4xl tracking-tight">Your Sifalo Pay. Your money.</h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-primary-fg/80">
                  Each merchant connects their own Sifalo Pay API user. Checkout, verification, and
                  payouts stay on their account. Vela never sits in the middle of the funds.
                </p>
              </div>
              <Button asChild size="lg" variant="secondary" className="bg-surface text-fg hover:bg-paper">
                <a href="https://developer.sifalopay.com/sifalo-pay-checkout" target="_blank" rel="noreferrer">
                  <CreditCard />
                  Sifalo Pay docs
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Store;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-surface px-6 py-10 sm:px-8">
      <span className="grid size-10 place-items-center rounded-md bg-bg text-primary">
        <Icon className="size-4" />
      </span>
      <h3 className="mt-5 text-base font-semibold text-fg">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="rounded-xl border border-border bg-surface p-6 shadow-soft">
      <span className="font-display text-sm text-primary">{n}</span>
      <h3 className="mt-3 text-lg font-semibold tracking-tight text-fg">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
    </li>
  );
}

function HeroPreview() {
  return (
    <div className="rise rise-3 relative mx-auto w-full max-w-md">
      <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-lg bg-primary font-display text-primary-fg">
            MA
          </span>
          <div>
            <p className="font-semibold text-fg">Maya Atelier</p>
            <p className="text-sm text-muted">Brand systems for independent makers</p>
          </div>
        </div>
        <div className="mt-5 space-y-2">
          <div className="h-11 rounded-lg border border-border bg-bg text-center text-sm font-medium leading-[2.75rem] text-fg">
            Read the studio notes
          </div>
          <div className="h-11 rounded-lg border border-border bg-bg text-center text-sm font-medium leading-[2.75rem] text-fg">
            Book a discovery call
          </div>
        </div>
        <div className="mt-5 overflow-hidden rounded-lg">
          <ProductCover style="mesh-1" title="Brand Identity Kit" className="aspect-[16/9]" />
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="font-medium text-fg">Brand Identity Kit</span>
          <span className="tabular-nums font-semibold text-fg">$49</span>
        </div>
        <div className="mt-6 flex items-center justify-center">
          <Logo markClassName="size-5" className="text-subtle" />
        </div>
      </div>
    </div>
  );
}
