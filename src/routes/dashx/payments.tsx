import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AdminPage } from "@/components/dashx-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { getPaySettings, savePaySettings, testPaySettings } from "@/lib/server/admin";
import { SIFALO_PRESETS } from "@/lib/constants";
import { errMsg } from "@/lib/errors";

export const Route = createFileRoute("/dashx/payments")({ component: DashxPayments });

function DashxPayments() {
  const [gatewayUrl, setGatewayUrl] = useState(SIFALO_PRESETS.production.gatewayUrl);
  const [verifyUrl, setVerifyUrl] = useState(SIFALO_PRESETS.production.verifyUrl);
  const [checkoutPage, setCheckoutPage] = useState(SIFALO_PRESETS.production.checkoutPage);
  const [apiKey, setApiKey] = useState("");
  const [apiPassword, setApiPassword] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [usePlatform, setUsePlatform] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    getPaySettings()
      .then((pay) => {
        setGatewayUrl(pay.gatewayUrl);
        setVerifyUrl(pay.verifyUrl);
        setCheckoutPage(pay.checkoutPage);
        setApiKey(pay.apiKey);
        setHasPassword(pay.hasPassword);
        setUsePlatform(pay.usePlatformCredentials);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  function applyPreset(kind: keyof typeof SIFALO_PRESETS) {
    const preset = SIFALO_PRESETS[kind];
    setGatewayUrl(preset.gatewayUrl);
    setVerifyUrl(preset.verifyUrl);
    setCheckoutPage(preset.checkoutPage);
  }

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await savePaySettings({
        data: {
          gatewayUrl,
          verifyUrl,
          checkoutPage,
          apiKey,
          apiPassword,
          usePlatformCredentials: usePlatform,
        },
      });
      if (apiPassword) setHasPassword(true);
      setApiPassword("");
      toast.success("Sifalo Pay settings saved.");
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setSaving(false);
    }
  }

  async function onTest() {
    setTesting(true);
    try {
      const result = await testPaySettings();
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setTesting(false);
    }
  }

  return (
    <AdminPage
      title="Payments"
      description="Sifalo Pay hosted checkout. Endpoints and optional platform credentials live here — merchants can still paste their own keys in shop settings."
    >
      <Card className="mb-6 space-y-3 p-5">
        <p className="text-sm leading-relaxed text-muted">
          Flow from{" "}
          <a
            className="font-medium text-fg underline-offset-4 hover:underline"
            href="https://developer.sifalopay.com/docs/hosted-checkout"
            target="_blank"
            rel="noreferrer"
          >
            developer.sifalopay.com
          </a>
          : POST the gateway with Basic Auth → redirect to the checkout page with{" "}
          <code className="rounded bg-bg px-1.5 py-0.5 text-xs text-fg">key</code> and{" "}
          <code className="rounded bg-bg px-1.5 py-0.5 text-xs text-fg">token</code> → buyer returns
          with <code className="rounded bg-bg px-1.5 py-0.5 text-xs text-fg">sid</code> → POST verify
          (no auth). Success is <code className="rounded bg-bg px-1.5 py-0.5 text-xs text-fg">status: success</code>{" "}
          or <code className="rounded bg-bg px-1.5 py-0.5 text-xs text-fg">code: 601</code>. Live
          keys only work on .com hosts; staging keys only on .net.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => applyPreset("production")}>
            Production hosts
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => applyPreset("staging")}>
            Staging hosts
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <form onSubmit={onSave} className="grid gap-4 sm:grid-cols-2">
          <Field label="Gateway URL" hint="POST amount, gateway: checkout, currency, return_url, order_id">
            <Input value={gatewayUrl} onChange={(e) => setGatewayUrl(e.target.value)} required />
          </Field>
          <Field label="Verify URL" hint="POST { sid } or { order_id }. No Basic Auth.">
            <Input value={verifyUrl} onChange={(e) => setVerifyUrl(e.target.value)} required />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Checkout page" hint="Buyer lands on this URL with ?key=&token=">
              <Input value={checkoutPage} onChange={(e) => setCheckoutPage(e.target.value)} required />
            </Field>
          </div>
          <Field label="Platform API username">
            <Input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
              placeholder="From Merchant → API"
            />
          </Field>
          <Field
            label="Platform API password"
            hint={hasPassword ? "Saved. Leave blank to keep it." : "The API key from Sifalo Pay."}
          >
            <Input
              type="password"
              value={apiPassword}
              onChange={(e) => setApiPassword(e.target.value)}
              autoComplete="new-password"
              placeholder={hasPassword ? "••••••••" : ""}
            />
          </Field>
          <label className="flex items-start gap-3 text-sm text-fg sm:col-span-2">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-primary"
              checked={usePlatform}
              onChange={(e) => setUsePlatform(e.target.checked)}
            />
            <span>
              <span className="font-medium">Collect with these platform credentials</span>
              <span className="mt-0.5 block text-xs text-muted">
                When on, every paid checkout uses this merchant account instead of the shop’s keys.
                Leave off so each maker pastes their own Sifalo Pay username and password.
              </span>
            </span>
          </label>
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <Button type="submit" disabled={!loaded || saving}>
              {saving ? "Saving…" : "Save payments"}
            </Button>
            <Button type="button" variant="secondary" disabled={!loaded || testing} onClick={() => void onTest()}>
              {testing ? "Checking…" : "Test credentials"}
            </Button>
          </div>
        </form>
      </Card>
    </AdminPage>
  );
}
