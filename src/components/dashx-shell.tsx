import { useEffect, useState, type ReactNode } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Store, Receipt, Users, Mail, Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { authClient } from "@/lib/auth/client";
import { getIsPlatformAdmin } from "@/lib/server/admin";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { errMsg } from "@/lib/errors";

const NAV = [
  { to: "/dashx", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/dashx/shops", label: "Shops", icon: Store, exact: false },
  { to: "/dashx/orders", label: "Orders", icon: Receipt, exact: false },
  { to: "/dashx/users", label: "Accounts", icon: Users, exact: false },
  { to: "/dashx/mail", label: "Email", icon: Mail, exact: false },
] as const;

function navActive(pathname: string, to: string, exact: boolean) {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function DashxShell() {
  const { user, isPending } = useCurrentUserState();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!user) {
      setAllowed(false);
      return;
    }
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
    setMenuOpen(false);
  }, [pathname]);

  if (isPending || (user && allowed === null)) {
    return (
      <div className="min-h-screen bg-bg p-8">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }
  if (!user) return <DashxSignIn />;
  if (!allowed) {
    return (
      <main className="grid min-h-screen place-items-center bg-bg px-4">
        <p className="text-sm text-muted">You do not have access.</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
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
        <div className="border-t border-border p-4">
          <UserButton />
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur-md lg:px-8">
          <button
            type="button"
            className="grid size-11 place-items-center rounded-md hover:bg-bg lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <p className="text-sm font-medium text-fg">Platform</p>
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
            <nav className="flex flex-col gap-0.5 px-3 py-4">
              {NAV.map((item) => (
                <NavLink key={item.to} {...item} pathname={pathname} />
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
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
    <main className="grid min-h-screen place-items-center bg-bg px-4">
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
