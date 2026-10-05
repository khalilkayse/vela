import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { AuthChip } from "@/components/auth-chip";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

export function SiteHeader({
  solid = false,
  className,
}: {
  solid?: boolean;
  className?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useCurrentUserState();

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-border/70 bg-bg/80 backdrop-blur-md",
        solid && "bg-surface/90",
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link to="/" aria-label="Kart home">
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
        <div className="flex items-center gap-2">
          <AuthChip className="hidden sm:flex" />
          <button
            type="button"
            className="grid size-11 place-items-center rounded-md hover:bg-bg md:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-x-0 top-0 flex max-h-screen flex-col overflow-y-auto bg-surface shadow-soft">
            <div className="flex h-16 items-center justify-between px-4">
              <Logo />
              <button
                type="button"
                className="grid size-11 place-items-center rounded-md hover:bg-bg"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1 px-4 pb-4 text-base font-medium text-fg">
              <Link
                to="/discover"
                className="rounded-md px-3 py-3 hover:bg-bg"
                onClick={() => setMenuOpen(false)}
              >
                Discover
              </Link>
              <Link
                to="/"
                hash="how"
                className="rounded-md px-3 py-3 hover:bg-bg"
                onClick={() => setMenuOpen(false)}
              >
                How it works
              </Link>
              {user ? (
                <Link
                  to="/dashboard"
                  className="rounded-md px-3 py-3 hover:bg-bg"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
              ) : null}
            </nav>
            <div className="border-t border-border p-4 sm:hidden">
              {user ? <UserButton /> : <AuthChip />}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Logo />
        <p className="max-w-md text-sm leading-relaxed text-muted sm:text-right">
          One click storefronts for independent makers, with checkout by Sifalo Pay.
        </p>
      </div>
    </footer>
  );
}
