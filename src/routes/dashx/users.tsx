import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { toast } from "sonner";
import { AdminPage } from "@/components/dashx-shell";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { listPlatformUsers, setUserDisabled, type AdminUser } from "@/lib/server/admin";
import { formatCountry } from "@/lib/geo";
import { errMsg } from "@/lib/errors";

export const Route = createFileRoute("/dashx/users")({ component: AdminUsers });

function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function reload() {
    setUsers(await listPlatformUsers());
  }

  useEffect(() => {
    reload().catch(() => setUsers([]));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!users) return [];
    if (!q) return users;
    return users.filter((person) =>
      [person.name, person.email, person.username, person.shopName, person.signupCountry]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [users, query]);

  async function toggle(person: AdminUser) {
    setBusy(person.id);
    try {
      await setUserDisabled({
        data: { userId: person.id, disabled: !person.disabled },
      });
      toast.success(person.disabled ? "Account enabled." : "Account disabled.");
      await reload();
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminPage
      title="Accounts"
      description="Last login, signup country, and the ability to disable an account. Blocked countries live under Access."
    >
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name, email, shop, country"
        className="mb-5 max-w-md"
      />
      {users === null ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : filtered.length === 0 ? (
        <EmptyState title="No accounts" body="The next person who signs up will appear here." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Person</th>
                <th className="px-5 py-3 font-medium">Shop</th>
                <th className="px-5 py-3 font-medium">Signup</th>
                <th className="px-5 py-3 font-medium">Last login</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((person) => (
                <tr key={person.id} className={person.disabled ? "opacity-60" : undefined}>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-fg">{person.name || "—"}</p>
                      {person.isAdmin ? <Badge tone="primary">Owner</Badge> : null}
                      {person.disabled ? <Badge tone="danger">Disabled</Badge> : null}
                    </div>
                    <p className="text-xs text-muted">{person.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    {person.username ? (
                      <Link
                        to="/$username"
                        params={{ username: person.username }}
                        className="font-medium text-primary hover:underline"
                      >
                        {person.shopName} /{person.username}
                      </Link>
                    ) : (
                      <span className="text-muted">No shop yet</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-muted">
                    <p>{formatCountry(person.signupCountry)}</p>
                    <p className="text-xs">
                      {person.createdAt ? format(new Date(person.createdAt), "d MMM yyyy") : "—"}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-muted">
                    <p>{person.lastLoginAt ? format(new Date(person.lastLoginAt), "d MMM yyyy HH:mm") : "Never"}</p>
                    <p className="text-xs">{formatCountry(person.lastLoginCountry)}</p>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {person.isAdmin ? null : (
                      <Button
                        variant={person.disabled ? "secondary" : "ghost"}
                        size="sm"
                        disabled={busy === person.id}
                        onClick={() => void toggle(person)}
                      >
                        {person.disabled ? "Enable" : "Disable"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </AdminPage>
  );
}
