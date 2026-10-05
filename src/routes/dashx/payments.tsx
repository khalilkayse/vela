import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AdminPage } from "@/components/dashx-shell";
import { Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import {
  clearPayCredentials,
  getPaySettings,
  savePaySettings,
  testPaySettings,
} from "@/lib/server/admin";
import type { SifaloEnv } from "@/lib/constants";
import { errMsg } from "@/lib/errors";
import { computeFee } from "@/lib/fees";
import { formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/dashx/payments")({ component: DashxPayments });

function DashxPayments() {
  const [mode, setMode] = useState<SifaloEnv>("sandbox");
  const [sandboxApiUser, setSandboxApiUser] = useState("");
  const [sandboxApiKey, setSandboxApiKey] = useState("");
  const [sandboxHasKey, setSandboxHasKey] = useState(false);
  const [liveApiUser, setLiveApiUser] = useState("");
  const [liveApiKey, setLiveApiKey] = useState("");
  const [liveHasKey, setLiveHasKey] = useState(false);
  const [feePercent, setFeePercent] = useState("0");
  const [feeFixed, setFeeFixed] = useState("0");
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<SifaloEnv | null>(null);
  const [clearing, setClearing] = useState<SifaloEnv | null>(null);

  function load() {
    setLoadError(null);
    getPaySettings()
      .then((pay) => {
        setMode(pay.mode);
        setSandboxApiUser(pay.sandboxApiUser);
        setSandboxHasKey(pay.sandboxHasKey);
        setLiveApiUser(pay.liveApiUser);
        setLiveHasKey(pay.liveHasKey);
        setFeePercent(String(pay.feePercent));
        setFeeFixed(String(pay.feeFixed));
        setLoaded(true);
      })
      .catch((error) => {
        setLoadError(errMsg(error));
        setLoaded(true);
      });
  }

  useEffect(load, []);

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await savePaySettings({
        data: {
          mode,
          sandboxApiUser,
          sandboxApiKey,
          liveApiUser,
          liveApiKey,
          feePercent: Number(feePercent) || 0,
          feeFixed: Number(feeFixed) || 0,
        },
      });
      if (sandboxApiKey) setSandboxHasKey(true);
      if (liveApiKey) setLiveHasKey(true);
      setSandboxApiKey("");
      setLiveApiKey("");
      toast.success("Payment settings saved.");
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setSaving(false);
    }
  }

  async function onTest(env: SifaloEnv) {
    setTesting(env);
    try {
      const result = await testPaySettings({ data: env });
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setTesting(null);
    }
  }

  async function onClear(env: SifaloEnv) {
    if (!window.confirm(`Clear the ${env} credentials? Checkout in ${env} mode will stop working.`)) return;
    setClearing(env);
    try {
      await clearPayCredentials({ data: env });
      if (env === "sandbox") {
        setSandboxApiUser("");
        setSandboxHasKey(false);
      } else {
        setLiveApiUser("");
        setLiveHasKey(false);
      }
      toast.success(`${env === "live" ? "Live" : "Sandbox"} credentials cleared.`);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setClearing(null);
    }
  }

  const example = computeFee(20, Number(feePercent) || 0, Number(feeFixed) || 0);

  return (
    <AdminPage
      title="Payments"
      description="One Sifalo Pay merchant account runs checkout for every shop. Sellers no longer connect their own — see Settings → Payouts on their dashboard for where their earnings go."
    >
      {loadError ? (
        <Card className="mb-6 border-danger/30 bg-danger/5 p-5">
          <p className="text-sm text-danger">Could not load payment settings: {loadError}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={load}>
            Try again
          </Button>
        </Card>
      ) : null}

      <Card className="mb-6 space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-fg">Active mode</p>
          <Badge tone={mode === "live" ? "success" : "warn"}>{mode === "live" ? "Live" : "Sandbox"}</Badge>
        </div>
        <p className="text-sm leading-relaxed text-muted">
          Sandbox uses Sifalo's test hosts (pay.sifalo.net) — test cards and wallets unlock real
          products on this instance, so only use it while setting up. Switch to Live once the live
          credentials below are saved and tested.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === "sandbox" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setMode("sandbox")}
          >
            Sandbox
          </Button>
          <Button
            type="button"
            variant={mode === "live" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setMode("live")}
          >
            Live
          </Button>
        </div>
      </Card>

      <form onSubmit={onSave} className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-fg">Sandbox credentials</h2>
            <Badge tone={sandboxHasKey ? "success" : "neutral"}>{sandboxHasKey ? "Saved" : "Not set"}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            From{" "}
            <a className="font-medium text-fg underline-offset-4 hover:underline" href="https://pay.sifalo.net/business" target="_blank" rel="noreferrer">
              pay.sifalo.net/business
            </a>{" "}
            → Merchant → API.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="API username">
              <Input value={sandboxApiUser} onChange={(e) => setSandboxApiUser(e.target.value)} autoComplete="off" />
            </Field>
            <Field label="API key" hint={sandboxHasKey ? "Saved. Leave blank to keep it." : undefined}>
              <Input
                type="password"
                value={sandboxApiKey}
                onChange={(e) => setSandboxApiKey(e.target.value)}
                autoComplete="new-password"
                placeholder={sandboxHasKey ? "••••••••" : ""}
              />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={testing === "sandbox"} onClick={() => void onTest("sandbox")}>
              {testing === "sandbox" ? "Checking…" : "Test sandbox"}
            </Button>
            {sandboxHasKey ? (
              <Button type="button" variant="ghost" size="sm" disabled={clearing === "sandbox"} onClick={() => void onClear("sandbox")}>
                Clear sandbox keys
              </Button>
            ) : null}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-fg">Live credentials</h2>
            <Badge tone={liveHasKey ? "success" : "neutral"}>{liveHasKey ? "Saved" : "Not set"}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            From{" "}
            <a className="font-medium text-fg underline-offset-4 hover:underline" href="https://pay.sifalo.com/business" target="_blank" rel="noreferrer">
              pay.sifalo.com/business
            </a>{" "}
            → Merchant → API. These charge real money — only use them once you're ready to go live.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="API username">
              <Input value={liveApiUser} onChange={(e) => setLiveApiUser(e.target.value)} autoComplete="off" />
            </Field>
            <Field label="API key" hint={liveHasKey ? "Saved. Leave blank to keep it." : undefined}>
              <Input
                type="password"
                value={liveApiKey}
                onChange={(e) => setLiveApiKey(e.target.value)}
                autoComplete="new-password"
                placeholder={liveHasKey ? "••••••••" : ""}
              />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={testing === "live"} onClick={() => void onTest("live")}>
              {testing === "live" ? "Checking…" : "Test live"}
            </Button>
            {liveHasKey ? (
              <Button type="button" variant="ghost" size="sm" disabled={clearing === "live"} onClick={() => void onClear("live")}>
                Clear live keys
              </Button>
            ) : null}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-semibold text-fg">Platform fee</h2>
          <p className="mt-1 text-sm text-muted">
            Taken out of every sale before it's added to the seller's balance. The buyer always pays
            the listed price.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Percent" hint="0–50%">
              <Input
                inputMode="decimal"
                value={feePercent}
                onChange={(e) => setFeePercent(e.target.value)}
              />
            </Field>
            <Field label="Fixed amount (USD)" hint="0–100, added on top of the percent">
              <Input
                inputMode="decimal"
                value={feeFixed}
                onChange={(e) => setFeeFixed(e.target.value)}
              />
            </Field>
          </div>
          <p className="mt-4 text-sm text-muted">
            Example: a {formatPrice(20)} sale → fee {formatPrice(example.fee)} → seller gets {formatPrice(example.net)}.
          </p>
        </Card>

        <Button type="submit" disabled={!loaded || Boolean(loadError) || saving}>
          {saving ? "Saving…" : "Save payments"}
        </Button>
      </form>
    </AdminPage>
  );
}
