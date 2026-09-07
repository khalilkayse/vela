import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { DashboardPage, useShop } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/skeleton";
import { LAYOUTS, type ShopLayout } from "@/lib/constants";
import { errMsg } from "@/lib/errors";
import { disconnectSifalo, saveSifaloCredentials, updateShop } from "@/lib/server/shops";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/settings")({ component: SettingsPage });

function SettingsPage() {
  const { shop, setShop, reloadShop } = useShop();
  const [displayName, setDisplayName] = useState(shop.displayName);
  const [username, setUsername] = useState(shop.username);
  const [tagline, setTagline] = useState(shop.tagline);
  const [bio, setBio] = useState(shop.bio);
  const [layout, setLayout] = useState<ShopLayout>(shop.layout);
  const [websiteUrl, setWebsiteUrl] = useState(shop.websiteUrl ?? "");
  const [instagramUrl, setInstagramUrl] = useState(shop.instagramUrl ?? "");
  const [xUrl, setXUrl] = useState(shop.xUrl ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(shop.youtubeUrl ?? "");
  const [tiktokUrl, setTiktokUrl] = useState(shop.tiktokUrl ?? "");
  const [published, setPublished] = useState(shop.published);
  const [apiKey, setApiKey] = useState("");
  const [apiPassword, setApiPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingPay, setSavingPay] = useState(false);

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const next = await updateShop({
        data: {
          displayName,
          username,
          tagline,
          bio,
          layout,
          websiteUrl,
          instagramUrl,
          xUrl,
          youtubeUrl,
          tiktokUrl,
          published,
        },
      });
      setShop(next);
      toast.success("Shop saved.");
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setSaving(false);
    }
  }

  async function onConnectPay(event: React.FormEvent) {
    event.preventDefault();
    setSavingPay(true);
    try {
      const result = await saveSifaloCredentials({ data: { apiKey, apiPassword } });
      await reloadShop();
      setApiPassword("");
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setSavingPay(false);
    }
  }

  async function onDisconnect() {
    setSavingPay(true);
    try {
      await disconnectSifalo();
      await reloadShop();
      setApiKey("");
      setApiPassword("");
      toast.success("Sifalo Pay disconnected.");
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setSavingPay(false);
    }
  }

  return (
    <DashboardPage title="Settings" description="Your public page, username, and Sifalo Pay credentials.">
      <form onSubmit={onSave} className="space-y-5 rounded-xl border border-border bg-surface p-5 shadow-soft sm:p-6">
        <h2 className="text-base font-semibold text-fg">Profile</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Display name">
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </Field>
          <Field label="Username">
            <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} required />
          </Field>
        </div>
        <Field label="Tagline">
          <Input value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={120} />
        </Field>
        <Field label="Bio">
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={600} />
        </Field>
        <div>
          <p className="mb-2 text-sm font-medium text-fg">Layout</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {LAYOUTS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setLayout(option.id)}
                className={cn(
                  "rounded-lg border px-3 py-3 text-left",
                  layout === option.id ? "border-primary bg-primary/5" : "border-border hover:bg-bg",
                )}
              >
                <span className="block text-sm font-medium text-fg">{option.label}</span>
                <span className="text-xs text-muted">{option.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Website">
            <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://" />
          </Field>
          <Field label="Instagram">
            <Input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://" />
          </Field>
          <Field label="X">
            <Input value={xUrl} onChange={(e) => setXUrl(e.target.value)} placeholder="https://" />
          </Field>
          <Field label="YouTube">
            <Input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://" />
          </Field>
          <Field label="TikTok">
            <Input value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} placeholder="https://" />
          </Field>
        </div>
        <Switch checked={published} onCheckedChange={setPublished} label="Published — listed on Discover and reachable at /you" />
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </form>

      <Card className="mt-8 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-fg">Sifalo Pay</h2>
            <p className="mt-1 max-w-xl text-sm text-muted">
              Use the API username and password from your Sifalo Pay dashboard. Checkout is initiated with
              Basic Auth against{" "}
              <a
                className="font-medium text-fg underline-offset-4 hover:underline"
                href="https://developer.sifalopay.com/sifalo-pay-checkout"
                target="_blank"
                rel="noreferrer"
              >
                api.sifalopay.com/gateway
              </a>
              . Funds never pass through Vela.
            </p>
          </div>
          {shop.hasSifaloCredentials ? (
            <Badge tone={shop.sifaloConnected ? "success" : "warn"}>
              {shop.sifaloConnected ? "Connected" : "Saved"}
            </Badge>
          ) : (
            <Badge>Not connected</Badge>
          )}
        </div>
        <form onSubmit={onConnectPay} className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="API username">
            <Input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
              placeholder={shop.hasSifaloCredentials ? "Saved — enter to replace" : "Your Sifalo API user"}
              required
            />
          </Field>
          <Field label="API password">
            <Input
              type="password"
              value={apiPassword}
              onChange={(e) => setApiPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </Field>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" disabled={savingPay}>
              {savingPay ? "Checking…" : "Save and verify"}
            </Button>
            {shop.hasSifaloCredentials ? (
              <Button type="button" variant="secondary" disabled={savingPay} onClick={onDisconnect}>
                Disconnect
              </Button>
            ) : null}
          </div>
        </form>
      </Card>
    </DashboardPage>
  );
}
