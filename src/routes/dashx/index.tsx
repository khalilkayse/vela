import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminPage } from "@/components/dashx-shell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getPlatformStats } from "@/lib/server/admin";
import { formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/dashx/")({ component: DashxHome });

function DashxHome() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getPlatformStats>> | null>(null);

  useEffect(() => {
    getPlatformStats()
      .then(setStats)
      .catch(() =>
        setStats({ users: 0, shops: 0, products: 0, orders: 0, paid: 0, revenue: 0 }),
      );
  }, []);

  return (
    <AdminPage title="Overview" description="Merchants, shops, and Sifalo Pay volume on this Kart instance.">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Accounts" value={stats ? String(stats.users) : null} to="/dashx/users" />
        <Stat label="Shops" value={stats ? String(stats.shops) : null} to="/dashx/shops" />
        <Stat label="Products" value={stats ? String(stats.products) : null} />
        <Stat label="Paid orders" value={stats ? String(stats.paid) : null} to="/dashx/orders" />
        <Stat label="All orders" value={stats ? String(stats.orders) : null} to="/dashx/orders" />
        <Stat label="Volume" value={stats ? formatPrice(stats.revenue) : null} />
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <SetupCard
          to="/dashx/access"
          title="Access"
          body="Default shop country and blocked signup regions."
        />
        <SetupCard
          to="/dashx/mail"
          title="Email"
          body="SMTP for confirmation, reset, and the shop welcome note."
        />
        <SetupCard
          to="/dashx/storage"
          title="Storage"
          body="Private S3 or R2 bucket. Paid buyers get signed downloads."
        />
        <SetupCard
          to="/dashx/payments"
          title="Payments"
          body="Sifalo Pay hosts and optional platform credentials."
        />
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

function SetupCard({ to, title, body }: { to: string; title: string; body: string }) {
  return (
    <Link to={to} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="h-full p-5">
        <p className="text-sm font-semibold text-fg">{title}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
      </Card>
    </Link>
  );
}
