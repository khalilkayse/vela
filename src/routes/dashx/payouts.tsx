import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AdminPage } from "@/components/dashx-shell";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { listPayoutBalances, listPayoutsForShop, recordPayout, type PayoutBalance } from "@/lib/server/admin";
import { PAYOUT_METHODS } from "@/lib/constants";
import type { Payout } from "@/lib/types";
import { errMsg } from "@/lib/errors";
import { formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/dashx/payouts")({ component: AdminPayouts });

function methodLabel(id: string | null): string {
  return PAYOUT_METHODS.find((option) => option.id === id)?.label ?? "Not set";
}

function AdminPayouts() {
  const [balances, setBalances] = useState<PayoutBalance[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Record<number, Payout[]>>({});

  async function reload() {
    setLoadError(null);
    setBalances(await listPayoutBalances());
  }

  useEffect(() => {
    reload().catch((error) => setLoadError(errMsg(error)));
  }, []);

  async function toggleHistory(shopId: number) {
    if (history[shopId]) {
      setHistory((current) => {
        const next = { ...current };
        delete next[shopId];
        return next;
      });
      return;
    }
    try {
      const rows = await listPayoutsForShop({ data: shopId });
      setHistory((current) => ({ ...current, [shopId]: rows }));
    } catch (error) {
      toast.error(errMsg(error));
    }
  }

  async function onRecord(balance: PayoutBalance) {
    setSaving(true);
    try {
      await recordPayout({ data: { shopId: balance.shopId, reference, note } });
      toast.success(`Recorded a payout of ${formatPrice(balance.balance, balance.currency)} to ${balance.shopDisplayName}.`);
      setOpen(null);
      setReference("");
      setNote("");
      await reload();
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPage
      title="Payouts"
      description="What every shop is owed after the platform fee. Send the money yourself, then record it here."
    >
      {loadError ? (
        <ErrorState message={loadError} onRetry={() => void reload().catch((error) => setLoadError(errMsg(error)))} />
      ) : balances === null ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : balances.length === 0 ? (
        <EmptyState title="Nothing owed" body="Every live, paid order has already been paid out, or there are none yet." />
      ) : (
        <div className="space-y-3">
          {balances.map((balance) => (
            <Card key={balance.shopId} className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to="/$username"
                      params={{ username: balance.shopUsername }}
                      className="font-semibold text-fg hover:underline"
                    >
                      {balance.shopDisplayName}
                    </Link>
                    <Badge tone="warn">{formatPrice(balance.balance, balance.currency)} owed</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {methodLabel(balance.payoutMethod)}
                    {balance.payoutAccount ? ` · ${balance.payoutAccount}` : ""}
                    {balance.payoutName ? ` · ${balance.payoutName}` : ""}
                  </p>
                  {balance.ownerEmail ? <p className="text-xs text-subtle">{balance.ownerEmail}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" size="sm" onClick={() => void toggleHistory(balance.shopId)}>
                    {history[balance.shopId] ? "Hide history" : "History"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setOpen(open === balance.shopId ? null : balance.shopId);
                      setReference("");
                      setNote("");
                    }}
                  >
                    Record payout
                  </Button>
                </div>
              </div>

              {open === balance.shopId ? (
                <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
                  <Field label="Reference" hint="A transaction id or note to match your records.">
                    <Input value={reference} onChange={(e) => setReference(e.target.value)} />
                  </Field>
                  <Field label="Note">
                    <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Button disabled={saving} onClick={() => void onRecord(balance)}>
                      {saving ? "Recording…" : `Mark ${formatPrice(balance.balance, balance.currency)} as paid out`}
                    </Button>
                  </div>
                </div>
              ) : null}

              {history[balance.shopId] ? (
                <div className="mt-4 border-t border-border pt-4">
                  {history[balance.shopId].length === 0 ? (
                    <p className="text-sm text-muted">No payouts recorded yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {history[balance.shopId].map((payout) => (
                        <li key={payout.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted">
                            {new Date(payout.createdAt).toLocaleDateString()}
                            {payout.reference ? ` · ${payout.reference}` : ""}
                          </span>
                          <span className="font-medium text-fg">{formatPrice(payout.amount, payout.currency)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </AdminPage>
  );
}
