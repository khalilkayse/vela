import { useEffect, useState, type ReactNode } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Store,
  Receipt,
  Users,
  Mail,
  HardDrive,
  CreditCard,
  Shield,
  Wallet,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { authClient } from "@/lib/auth/client";
import { getIsPlatformAdmin, getPaySettings } from "@/lib/server/admin";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { errMsg } from "@/lib/errors";

const NAV = [
  { to: "/dashx", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/dashx/shops", label: "Shops", icon: Store, exact: false },
  { to: "/dashx/payouts", label: "Payouts", icon: Wallet, exact: false },
  { to: "/dashx/orders", label: "Orders", icon: Receipt, exact: false },
  { to: "/dashx/users", label: "Accounts", icon: Users, exact: false },
  { to: "/dashx/access", label: "Access", icon: Shield, exact: false },
  { to: "/dashx/mail", label: "Email", icon: Mail, exact: false },
  { to: "/dashx/storage", label: "Storage", icon: HardDrive, exact: false },
  { to: "/dashx/payments", label: "Payments", icon: CreditCard, exact: false },
] as const;

function stripTrailingSlash(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function navActive(pathname: string, to: string, exact: boolean) {
  const path = stripTrailingSlash(pathname);
  if (exact) return path === to;
  return path === to || path.startsWith(`${to}/`);
}

function currentPageLabel(pathname: string): string {
  const path = stripTrailingSlash(pathname);
  const match = [...NAV].reverse().find((item) => navActive(path, item.to, item.exact));
  return match?.label ?? "Platform";
}

function DashxFrame({ children }: { children: ReactNode }) {
  return <div className="dashx-theme min-h-screen bg-bg text-fg">{children}</div>;
}

export function DashxShell() {
  const { user, isPending } = useCurrentUserState();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [payBanner, setPayBanner] = useState<{ mode: "sandbox" | "live"; liveReady: boolean } | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!user) {
      setAllowed(false);
      return;
    }
    // Reset to the "checking" state first — otherwise a stale `false` from a
    // previous signed-out render flashes "You do not have access" while this
    // check is still in flight for the newly signed-in user.
    setAllowed(null);
    let cancelled = false;
    getIsPlatformAdmin()
      .then((ok) => {
        if (!cancelled) setAllowed(ok);
      })
      .catch(() => {
        if (!cancelled) setAllowed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!allowed) return;
    getPaySettings()
      .then((pay) => setPayBanner({ mode: pay.mode, liveReady: pay.liveHasKey && Boolean(pay.liveApiUser) }))
      .catch(() => undefined);
  }, [allowed]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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

  if (isPending || (user && allowed === null)) {
    return (
      <DashxFrame>
        <div className="p-8">
          <Skeleton className="h-10 w-48" />
        </div>
      </DashxFrame>
    );
  }
  if (!user) return <DashxSignIn />;
  if (!allowed) return <DashxNoAccess />;

  return (
    <DashxFrame>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-16 items-center px-5">
          <Logo />
        </div>
        <p className="px-5 pb-3 text-[11px] font-semibold uppercase tracking-wider text-muted">Console</p>
        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {NAV.map((item) => (
            <NavLink key={item.to} {...item} pathname={pathname} />
          ))}
        </nav>
        <div className="min-w-0 border-t border-border p-4">
          <UserButton />
        </div>
      </aside>

      <div className="lg:pl-60">
        {payBanner && (payBanner.mode === "sandbox" || !payBanner.liveReady) ? (
          <div className="flex items-center justify-center gap-2 bg-warn/15 px-4 py-2 text-center text-xs font-medium text-fg">
            {payBanner.mode === "sandbox"
              ? "Payments are in sandbox mode — test cards and wallets can unlock real products."
              : "Live Sifalo Pay credentials aren't set — paid checkout is off for every shop."}
            <Link to="/dashx/payments" className="underline underline-offset-2">
              Open Payments
            </Link>
          </div>
        ) : null}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur-md lg:px-8">
          <button
            type="button"
            className="grid size-11 place-items-center rounded-md hover:bg-bg lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <p className="text-sm font-medium text-fg">{currentPageLabel(pathname)}</p>
          <span />
        </header>
        <main className="px-4 py-8 pb-24 lg:px-8 lg:pb-12">
          <div className="mx-auto max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-surface shadow-soft">
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
            <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
              {NAV.map((item) => (
                <NavLink key={item.to} {...item} pathname={pathname} />
              ))}
            </nav>
            <div className="min-w-0 border-t border-border p-4">
              <UserButton />
            </div>
          </div>
        </div>
      ) : null}
    </DashxFrame>
  );
}

/** Signed in, but not a platform admin — e.g. a seller who found /dashx. */
function DashxNoAccess() {
  const [signingOut, setSigningOut] = useState(false);
  return (
    <DashxFrame>
      <main className="grid min-h-screen place-items-center px-4">
        <div className="max-w-sm text-center">
          <Logo className="justify-center" />
          <p className="mt-6 text-sm text-muted">
            You're signed in, but this account does not have access to the owner console.
          </p>
          <Button
            variant="secondary"
            className="mt-5"
            disabled={signingOut}
            onClick={() => {
              setSigningOut(true);
              void authClient.signOut().then(() => {
                window.location.href = "/dashx";
              });
            }}
          >
            {signingOut ? "Signing out…" : "Sign out and use a different account"}
          </Button>
        </div>
      </main>
    </DashxFrame>
  );
}

function DashxSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await authClient.signIn.email({ email, password, callbackURL: "/dashx" });
      if (result.error) throw new Error(result.error.message || "Could not sign in.");
      window.location.href = "/dashx";
    } catch (err) {
      setError(errMsg(err, "Could not sign in."));
      setBusy(false);
    }
  }

  return (
    <DashxFrame>
      <main className="grid min-h-screen place-items-center px-4">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
          <Logo />
          <h1 className="font-display text-3xl tracking-tight text-fg">Sign in</h1>
          <Field label="Email">
            <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : "Continue"}
          </Button>
        </form>
      </main>
    </DashxFrame>
  );
}

function NavLink({
  to,
  label,
  icon: Icon,
  exact,
  pathname,
}: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact: boolean;
  pathname: string;
}) {
  const active = navActive(pathname, to, exact);
  return (
    <Link
      to={to}
      className={cn(
        "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-150",
        active ? "bg-primary text-primary-fg" : "text-fg hover:bg-bg",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

export function AdminPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl tracking-tight text-fg">{title}</h1>
        {description ? <p className="mt-1.5 max-w-xl text-sm text-muted">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}
