import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { AdminPage } from "@/components/admin-shell";
import { Badge, Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { listPlatformUsers, type AdminUser } from "@/lib/server/admin";

export const Route = createFileRoute("/admin/users")({ component: AdminUsers });

function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);

  useEffect(() => {
    listPlatformUsers()
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  return (
    <AdminPage title="Accounts" description="Everyone who has signed up on this instance.">
      {users === null ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : users.length === 0 ? (
        <EmptyState title="No accounts" body="The next person who signs up will appear here." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Person</th>
                <th className="px-5 py-3 font-medium">Shop</th>
                <th className="px-5 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((person) => (
                <tr key={person.id}>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-fg">{person.name || "—"}</p>
                      {person.isAdmin ? <Badge tone="primary">Owner</Badge> : null}
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
                    {person.createdAt ? format(new Date(person.createdAt), "d MMM yyyy") : "—"}
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
