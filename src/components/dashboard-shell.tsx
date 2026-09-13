import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Package,
  Receipt,
  LayoutList,
  Settings,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import { Logo, Mark } from "@/components/logo";
import { UserButton } from "@/lib/auth/gates";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMyShop } from "@/lib/server/shops";
import type { Shop } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type ShopCtx = {
  shop: Shop;
  setShop: (shop: Shop) => void;
  reloadShop: () => Promise<void>;
};

const ShopContext = createContext<ShopCtx | null>(null);

export function useShop(): ShopCtx {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used inside the dashboard");
  return ctx;
}

const NAV = [
  { to: "/dashboard", label: "Home", icon: Home, exact: true },
  { to: "/dashboard/products", label: "Products", icon: Package, exact: false },
  { to: "/dashboard/orders", label: "Orders", icon: Receipt, exact: false },
  { to: "/dashboard/page", label: "Page", icon: LayoutList, exact: false },
  { to: "/dashboard/settings", label: "Settings", icon: Settings, exact: false },
] as const;

function navActive(pathname: string, to: string, exact: boolean) {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function DashboardShell() {
  const { user, isPending } = useCurrentUserState();
  const [shop, setShop] = useState<Shop | null | undefined>(undefined);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function reloadShop() {
    const next = await getMyShop();
    setShop(next);
  }

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getMyShop()
      .then((next) => {
        if (!cancelled) setShop(next);
      })
      .catch(() => {
        if (!cancelled) setShop(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (isPending || (user && shop === undefined)) {
    return <DashboardSkeleton />;
  }
  if (!user) return <RedirectToSignIn />;
  if (!shop) return <Navigate to="/onboarding" />;

  return (
    <ShopContext.Provider value={{ shop, setShop, reloadShop }}>
      <div className="min-h-screen bg-bg">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-surface lg:flex">
          <div className="flex h-16 items-center px-5">
            <Link to="/" aria-label="Vela home">
              <Logo />
            </Link>
          </div>
          <ShopBadge shop={shop} />
          <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
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
            <div className="hidden items-center gap-2 text-sm text-muted lg:flex">
              <span className="font-medium text-fg">{shop.displayName}</span>
              <span aria-hidden>·</span>
              <span>/{shop.username}</span>
            </div>
            <Link
              to="/$username"
              params={{ username: shop.username }}
              className="inline-flex h-11 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-fg hover:bg-bg"
            >
              View shop
              <ExternalLink className="size-3.5 text-muted" />
            </Link>
          </header>

          <main className="px-4 py-8 pb-24 lg:px-8 lg:pb-12">
            <div className="mx-auto max-w-5xl">
              <Outlet />
            </div>
          </main>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface lg:hidden">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = navActive(pathname, item.to, item.exact);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted",
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

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
              <ShopBadge shop={shop} />
              <nav className="flex flex-col gap-0.5 px-3 py-4">
                {NAV.map((item) => (
                  <NavLink key={item.to} {...item} pathname={pathname} />
                ))}
              </nav>
            </div>
          </div>
        ) : null}
      </div>
    </ShopContext.Provider>
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
  icon: typeof Home;
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

function ShopBadge({ shop }: { shop: Shop }) {
  return (
    <div className="mx-3 mb-1 flex items-center gap-3 rounded-lg bg-bg px-3 py-3">
      <span className="grid size-9 place-items-center rounded-md bg-primary text-xs font-semibold text-primary-fg">
        {shop.avatarInitials}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-fg">{shop.displayName}</p>
        <p className="truncate text-xs text-muted">/{shop.username}</p>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-border lg:bg-surface">
        <div className="flex h-16 items-center px-5">
          <Mark />
        </div>
        <div className="px-4 py-6">
          <Skeleton className="h-12 rounded-lg" />
          <div className="mt-6 space-y-2">
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
          </div>
        </div>
      </div>
      <div className="lg:pl-60">
        <div className="h-16 border-b border-border bg-surface" />
        <div className="p-8">
          <Skeleton className="h-8 w-48" />
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-tight text-fg">{title}</h1>
          {description ? <p className="mt-1.5 max-w-xl text-sm text-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
