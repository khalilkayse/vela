import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { DashboardPage, useShop } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/skeleton";
import { ImageWell } from "@/components/image-well";
import { UsernameInput } from "@/components/username-field";
import { LAYOUTS, type ShopLayout } from "@/lib/constants";
import { LayoutSketch } from "@/components/layout-sketch";
import { errMsg } from "@/lib/errors";
import { disconnectSifalo, getMyPayPolicy, saveSifaloCredentials, updateShop } from "@/lib/server/shops";
import { removeProductFile } from "@/lib/server/files";
import { uploadMedia } from "@/lib/upload";
import { formatCountry } from "@/lib/geo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/settings")({ component: SettingsPage });

function SettingsPage() {
  const { shop, setShop, reloadShop } = useShop();
  const [displayName, setDisplayName] = useState(shop.displayName);
  const [username, setUsername] = useState(shop.username);
  const [tagline, setTagline] = useState(shop.tagline);
  const [bio, setBio] = useState(shop.bio);
  const [terms, setTerms] = useState(shop.terms);
  const [contactEmail, setContactEmail] = useState(shop.contactEmail ?? "");
  const [layout, setLayout] = useState<ShopLayout>(shop.layout);
  const [websiteUrl, setWebsiteUrl] = useState(shop.websiteUrl ?? "");
  const [instagramUrl, setInstagramUrl] = useState(shop.instagramUrl ?? "");
  const [xUrl, setXUrl] = useState(shop.xUrl ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(shop.youtubeUrl ?? "");
  const [tiktokUrl, setTiktokUrl] = useState(shop.tiktokUrl ?? "");
  const [published, setPublished] = useState(shop.published);
  const [country, setCountry] = useState(shop.country ?? "");
  const [avatarUrl, setAvatarUrl] = useState(shop.avatarUrl);
  const [apiKey, setApiKey] = useState("");
  const [apiPassword, setApiPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingPay, setSavingPay] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [payPolicy, setPayPolicy] = useState<{
    platformCollects: boolean;
    allowOwnKeys: boolean;
    canConnectOwnKeys: boolean;
  } | null>(null);

  useEffect(() => {
    getMyPayPolicy()
      .then(setPayPolicy)
      .catch(() => setPayPolicy({ platformCollects: false, allowOwnKeys: true, canConnectOwnKeys: true }));
  }, []);

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
          terms,
          contactEmail,
          layout,
          websiteUrl,
          instagramUrl,
          xUrl,
          youtubeUrl,
          tiktokUrl,
          published,
          country,
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

  async function onAvatar(file: File) {
    setUploading(true);
    try {
      const uploaded = await uploadMedia(file, { kind: "avatar" });
      setAvatarUrl(uploaded.url);
      await reloadShop();
      toast.success("Photo updated.");
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setUploading(false);
    }
  }

  async function clearAvatar() {
    if (!shop.avatarFileId) {
      setAvatarUrl(null);
      return;
    }
    try {
      await removeProductFile({ data: shop.avatarFileId });
      setAvatarUrl(null);
      await reloadShop();
    } catch (error) {
      toast.error(errMsg(error));
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
    <DashboardPage title="Settings" description="Your public page, username, terms, and Sifalo Pay.">
      <form onSubmit={onSave} className="space-y-5 rounded-xl border border-border bg-surface p-5 shadow-soft sm:p-6">
        <h2 className="text-base font-semibold text-fg">Profile</h2>
        <ImageWell
          label="Profile photo"
          hint="Shown at the top of Studio and Page layouts. Square works best."
          url={avatarUrl}
          compact
          onFile={onAvatar}
          onClear={avatarUrl ? () => void clearAvatar() : undefined}
          busy={uploading}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Display name">
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </Field>
          <Field label="Username" hint={typeof window !== "undefined" ? `${window.location.origin}/${username}` : `/${username}`}>
            <UsernameInput value={username} onChange={setUsername} />
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
                <LayoutSketch layout={option.id} className="mb-3 h-24 p-2" />
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
          <Field label="Order email" hint="New-order notices go here. Defaults to your account email.">
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="studio@example.com"
            />
          </Field>
        </div>
        <Field label="Country" hint={country ? formatCountry(country) : "Inherited from signup. Used to base the store in a market."}>
          <Input
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
            placeholder="SO"
            maxLength={2}
          />
        </Field>
        <Field
          label="Store terms"
          hint="Shown on your public page and required at checkout. Refunds, delivery, usage — whatever buyers should agree to."
        >
          <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} maxLength={8000} />
        </Field>
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
              Get your API username and password from{" "}
              <a
                className="font-medium text-fg underline-offset-4 hover:underline"
                href="https://sifalopay.com"
                target="_blank"
                rel="noreferrer"
              >
                sifalopay.com
              </a>
              , then paste them here. Checkout goes to your Sifalo Pay account — Kart never holds the money.
            </p>
          </div>
          {shop.checkoutLive ? (
            <Badge tone="success">Live checkout</Badge>
          ) : shop.hasSifaloCredentials ? (
            <Badge tone={shop.sifaloConnected ? "success" : "warn"}>
              {shop.sifaloConnected ? "Connected" : "Saved"}
            </Badge>
          ) : (
            <Badge>Not connected</Badge>
          )}
        </div>
        {payPolicy && !payPolicy.canConnectOwnKeys ? (
          <p className="mt-6 rounded-lg border border-border bg-bg px-4 py-3 text-sm text-muted">
            Kart is collecting with the platform Sifalo Pay account for this shop.
            Ask the operator to enable “Allow own Sifalo keys” if you need to connect yours.
          </p>
        ) : (
        <form onSubmit={onConnectPay} className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="API username">
            <Input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
              placeholder={shop.hasSifaloCredentials ? "Saved — enter to replace" : "From sifalopay.com"}
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
        )}
      </Card>
    </DashboardPage>
  );
}
