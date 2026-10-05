import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { DashboardPage, useShop } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/skeleton";
import { ImageWell } from "@/components/image-well";
import { UsernameInput } from "@/components/username-field";
import { LAYOUTS, PAYOUT_METHODS, type PayoutMethod, type ShopLayout } from "@/lib/constants";
import { LayoutSketch } from "@/components/layout-sketch";
import { errMsg } from "@/lib/errors";
import { updatePayoutDetails, updateShop } from "@/lib/server/shops";
import { listMyPayouts } from "@/lib/server/orders";
import type { Payout } from "@/lib/types";
import { removeProductFile } from "@/lib/server/files";
import { uploadMedia } from "@/lib/upload";
import { formatCountry } from "@/lib/geo";
import { formatPrice } from "@/lib/utils";
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
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod | "">(shop.payoutMethod ?? "");
  const [payoutAccount, setPayoutAccount] = useState(shop.payoutAccount);
  const [payoutName, setPayoutName] = useState(shop.payoutName);
  const [savingPayout, setSavingPayout] = useState(false);
  const [payouts, setPayouts] = useState<Payout[] | null>(null);

  useEffect(() => {
    listMyPayouts()
      .then(setPayouts)
      .catch(() => setPayouts([]));
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
      setUsername(next.username);
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

  async function onSavePayout(event: React.FormEvent) {
    event.preventDefault();
    setSavingPayout(true);
    try {
      const next = await updatePayoutDetails({
        data: { method: payoutMethod, account: payoutAccount, name: payoutName },
      });
      setShop(next);
      toast.success("Payout details saved.");
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setSavingPayout(false);
    }
  }

  return (
    <DashboardPage title="Settings" description="Your public page, username, terms, and payouts.">
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
        <Switch
          checked={published}
          onCheckedChange={setPublished}
          label={`Published — listed on Discover and reachable at /${username || "you"}`}
        />
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </form>

      <Card className="mt-8 p-5 sm:p-6">
        <h2 className="text-base font-semibold text-fg">Payouts</h2>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Checkout runs through Kart's Sifalo Pay account, so we need to know where to send what
          you earn. Kart's fee comes out of each sale before it's added to your balance — see your
          balance on the Home page.
        </p>
        <form onSubmit={onSavePayout} className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Payout method">
            <select
              value={payoutMethod}
              onChange={(e) => setPayoutMethod(e.target.value as PayoutMethod)}
              className="h-11 w-full rounded-md border border-border bg-surface px-3.5 text-sm text-fg"
            >
              <option value="">Choose a method</option>
              {PAYOUT_METHODS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Account" hint="Phone number for mobile wallets, or account details for bank transfer.">
            <Input value={payoutAccount} onChange={(e) => setPayoutAccount(e.target.value)} placeholder="252 6xx xxx xxx" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Name on account">
              <Input value={payoutName} onChange={(e) => setPayoutName(e.target.value)} placeholder="As it appears on the wallet or account" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={savingPayout}>
              {savingPayout ? "Saving…" : "Save payout details"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="mt-8 p-5 sm:p-6">
        <h2 className="text-base font-semibold text-fg">Payout history</h2>
        {payouts === null ? (
          <p className="mt-3 text-sm text-muted">Loading…</p>
        ) : payouts.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No payouts yet. They show up here once Kart sends one.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {payouts.map((payout) => (
              <li key={payout.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-fg">{new Date(payout.createdAt).toLocaleDateString()}</p>
                  {payout.reference ? (
                    <p className="truncate text-xs text-muted">Ref {payout.reference}</p>
                  ) : null}
                </div>
                <p className="shrink-0 tabular-nums text-sm font-semibold text-fg">
                  {formatPrice(payout.amount, payout.currency)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </DashboardPage>
  );
}
