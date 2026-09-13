import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CreditCard, ShieldCheck } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ProductCover } from "@/components/product-cover";
import { LayoutSketch } from "@/components/layout-sketch";
import { APP_NAME, LAYOUTS, type ShopLayout } from "@/lib/constants";

export const Route = createFileRoute("/")({ component: Home });

const LAYOUT_COPY: Record<ShopLayout, string> = {
  hybrid:
    "Your name and bio sit at the top. A few buttons for the places you always send people. Products and services listed underneath.",
  shop: "A catalog first. Every product gets a cover, a price, and a checkout button. Your profile stays short so the work leads.",
  links:
    "A single column of buttons. Each one is a destination — a product, a booking link, a file, or anywhere else you want people to go.",
};

function Home() {
  return (
    <div className="min-h-screen bg-bg">
      <SiteHeader />
      <main>
        <section className="hero-dots relative overflow-hidden">
          <div className="pointer-events-none absolute -left-16 top-20 size-56 rotate-12 rounded-3xl bg-primary/10" />
          <div className="pointer-events-none absolute -right-10 bottom-10 size-40 -rotate-6 rounded-full bg-accent/10" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[1.08fr_0.92fr] lg:pb-24">
            <div className="rise">
              <p className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                {APP_NAME}
              </p>
              <h1 className="mt-5 font-display text-5xl font-bold leading-[1.02] tracking-tight text-fg sm:text-6xl lg:text-7xl">
                Open a shop
                <span className="text-primary"> in one click.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
                Claim a username. Publish files, sessions, and links. Buyers check out on
                Sifalo Pay, and the money goes to you — never through {APP_NAME}.
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
                Unique public URL. Purchase-gated files. Demo checkout until you connect keys.
              </p>
            </div>
            <HeroPreview />
          </div>
        </section>

        <section className="border-y border-border bg-surface">
          <div className="mx-auto grid max-w-6xl divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <Stat k="01" label="Your URL" value="/you" />
            <Stat k="02" label="Payouts" value="Sifalo Pay" />
            <Stat k="03" label="Files" value="After payment" />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Layouts</p>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-fg">
              Three ways to present the work.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Pick a layout when you open the shop. Switch later without losing products.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {LAYOUTS.map((layout) => (
              <article
                key={layout.id}
                className="flex flex-col rounded-xl border border-border bg-surface p-5 shadow-soft"
              >
                <LayoutSketch layout={layout.id} className="h-40" />
                <h3 className="mt-5 font-display text-xl font-bold tracking-tight text-fg">
                  {layout.label}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{LAYOUT_COPY[layout.id]}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="border-y border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">How it works</p>
              <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-fg">
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
                body="Paste your API username and password in settings. Checkout is hosted by Sifalo Pay, so funds land in your merchant account."
              />
              <Step
                n="03"
                title="Deliver after payment"
                body="Buyers pay on Sifalo Pay. Kart verifies the order, then unlocks the note, link, and any private files."
              />
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Payouts</p>
              <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-fg">
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
            <div className="overflow-hidden rounded-xl bg-primary px-6 py-10 text-primary-fg sm:px-10 sm:py-12">
              <h3 className="font-display text-3xl font-bold tracking-tight">Ready when you are.</h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-primary-fg/85">
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
      <p className="font-display text-sm font-bold text-primary">{k}</p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tracking-tight text-fg">{value}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="rounded-xl border border-border bg-bg p-6 shadow-soft">
      <span className="font-display text-sm font-bold text-primary">{n}</span>
      <h3 className="mt-3 text-lg font-bold tracking-tight text-fg">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
    </li>
  );
}

function HeroPreview() {
  return (
    <div className="rise rise-3 relative mx-auto w-full max-w-md">
      <div className="hero-float rounded-xl border border-border bg-surface p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-lg bg-primary font-display text-lg font-bold text-primary-fg">
            MA
          </span>
          <div>
            <p className="font-semibold text-fg">Maya Atelier</p>
            <p className="text-sm text-muted">Brand systems for independent makers</p>
          </div>
        </div>
        <div className="mt-5 space-y-2">
          <div className="h-11 rounded-full border border-border bg-bg text-center text-sm font-medium leading-[2.75rem] text-fg">
            Read the studio notes
          </div>
          <div className="h-11 rounded-full border border-border bg-bg text-center text-sm font-medium leading-[2.75rem] text-fg">
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
