import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminPage } from "@/components/admin-shell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getPlatformStats } from "@/lib/server/admin";
import { formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({ component: AdminHome });

function AdminHome() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getPlatformStats>> | null>(null);

  useEffect(() => {
    getPlatformStats()
      .then(setStats)
      .catch(() =>
        setStats({ users: 0, shops: 0, products: 0, orders: 0, paid: 0, revenue: 0 }),
      );
  }, []);

  return (
    <AdminPage
      title="Overview"
      description="Every merchant, shop, and Sifalo Pay order on this Vela instance."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Accounts" value={stats ? String(stats.users) : null} to="/admin/users" />
        <Stat label="Shops" value={stats ? String(stats.shops) : null} to="/admin/shops" />
        <Stat label="Products" value={stats ? String(stats.products) : null} />
        <Stat label="Paid orders" value={stats ? String(stats.paid) : null} to="/admin/orders" />
        <Stat label="All orders" value={stats ? String(stats.orders) : null} to="/admin/orders" />
        <Stat label="Volume" value={stats ? formatPrice(stats.revenue) : null} />
      </div>
    </AdminPage>
  );
}

function Stat({ label, value, to }: { label: string; value: string | null; to?: string }) {
  const inner = (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      {value === null ? (
        <Skeleton className="mt-3 h-8 w-20" />
      ) : (
        <p className="mt-2 font-display text-3xl text-fg">{value}</p>
      )}
    </Card>
  );
  if (!to) return inner;
  return (
    <Link to={to} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {inner}
    </Link>
  );
}
