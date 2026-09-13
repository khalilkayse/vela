import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CreditCard, LayoutPanelTop, Link2, ShieldCheck, Store } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ProductCover } from "@/components/product-cover";
import { APP_NAME } from "@/lib/constants";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="min-h-screen bg-bg">
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:pb-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="rise">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Storefronts for Sifalo Pay
              </p>
              <h1 className="mt-4 font-display text-5xl leading-[1.04] tracking-tight text-fg sm:text-6xl lg:text-7xl">
                A shop that looks like you.
                <span className="text-primary"> Checkout that pays you.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
                {APP_NAME} is a page for digital products, sessions, and links. Claim a
                username, publish a catalog, and connect Sifalo Pay. Funds go to the
                merchant — never through the platform.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link to="/login" search={{ next: "/onboarding" }}>
                    Open your shop
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link to="/discover">Browse shops</Link>
                </Button>
              </div>
              <p className="mt-4 text-sm text-subtle">
                Unique public URL. No platform fee on payouts. Demo checkout until you connect keys.
              </p>
            </div>
            <HeroPreview />
          </div>
        </section>

        <section className="border-y border-border bg-surface">
          <div className="mx-auto grid max-w-6xl divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <Stat k="01" label="Your URL" value="/you" />
            <Stat k="02" label="Payouts" value="Sifalo Pay" />
            <Stat k="03" label="Files" value="Purchase-gated" />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Layouts</p>
            <h2 className="mt-3 font-display text-4xl tracking-tight text-fg">
              Shop, studio, or a stack of links.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              One username. Three ways to present the work. Switch anytime without losing products.
            </p>
          </div>
          <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
            <Feature
              icon={Store}
              title="Shop"
              body="A catalog-first storefront. Covers, prices, and a checkout that belongs to each merchant."
            />
            <Feature
              icon={LayoutPanelTop}
              title="Studio"
              body="Profile, links, then products — organized like Stan, clearer like Shopify."
            />
            <Feature
              icon={Link2}
              title="Page"
              body="Stacked buttons for the people who just need a calm home on the internet."
            />
          </div>
        </section>

        <section id="how" className="border-y border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">How it works</p>
              <h2 className="mt-3 font-display text-4xl tracking-tight text-fg">
                Username, catalog, paid order.
              </h2>
            </div>
            <ol className="mt-12 grid gap-6 md:grid-cols-3">
              <Step
                n="01"
                title="Claim your page"
                body="Choose a unique username. That becomes your public store. Set a layout and publish files, sessions, or free links."
              />
              <Step
                n="02"
                title="Connect Sifalo Pay"
                body="Paste your API username and password, or ask the operator to collect on the platform account and grant your shop its own keys."
              />
              <Step
                n="03"
                title="Deliver after payment"
                body="Buyers pay on Sifalo Pay. Kart verifies the sid, then unlocks the note, link, and any private files."
              />
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Payouts</p>
              <h2 className="mt-3 font-display text-4xl tracking-tight text-fg">
                Your Sifalo Pay. Your money.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
                Checkout is hosted by Sifalo Pay. {APP_NAME} never sits in the middle of the
                funds. EDAHAB, ZAAD, Premier Wallet, and card — whatever the merchant’s
                Sifalo account accepts.
              </p>
              <div className="mt-6 flex items-start gap-3 text-sm text-muted">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                Private file downloads only after a paid order. Signed links, short-lived.
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-primary px-6 py-10 text-primary-fg sm:px-10 sm:py-12">
              <h3 className="font-display text-3xl tracking-tight">Ready when you are.</h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-primary-fg/80">
                Create an account, pick a username, and publish. Connect Sifalo Pay when you
                want live checkout — demo flow works until then.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" variant="secondary" className="bg-surface text-fg hover:bg-paper">
                  <Link to="/login" search={{ next: "/onboarding" }}>
                    Start selling
                    <ArrowRight />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="text-primary-fg hover:bg-primary-hover"
                >
                  <a href="https://developer.sifalopay.com/docs/hosted-checkout" target="_blank" rel="noreferrer">
                    <CreditCard />
                    Sifalo Pay docs
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ k, label, value }: { k: string; label: string; value: string }) {
  return (
    <div className="px-6 py-8 sm:px-8">
      <p className="font-display text-sm text-primary">{k}</p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl tracking-tight text-fg">{value}</p>
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
    <li className="rounded-xl border border-border bg-bg p-6 shadow-soft">
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
