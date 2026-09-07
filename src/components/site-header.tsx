import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/logo";
import { AuthChip } from "@/components/auth-chip";
import { cn } from "@/lib/utils";

export function SiteHeader({
  solid = false,
  className,
}: {
  solid?: boolean;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-transparent",
        solid ? "border-border bg-surface/90 backdrop-blur-md" : "bg-transparent",
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link to="/" aria-label="Vela home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 text-sm font-medium text-muted md:flex">
            <Link to="/discover" className="rounded-md px-3 py-2 hover:bg-bg hover:text-fg">
              Discover
            </Link>
            <Link to="/" hash="how" className="rounded-md px-3 py-2 hover:bg-bg hover:text-fg">
              How it works
            </Link>
          </nav>
        </div>
        <AuthChip />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Logo />
        <p className="text-sm text-muted">
          Storefronts and checkout for independent makers. Payments by{" "}
          <a
            href="https://sifalopay.com"
            className="font-medium text-fg underline-offset-4 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Sifalo Pay
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
