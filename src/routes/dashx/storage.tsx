import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AdminPage } from "@/components/dashx-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { getStorageSettings, saveStorageSettings, testStorage } from "@/lib/server/admin";
import { errMsg } from "@/lib/errors";

export const Route = createFileRoute("/dashx/storage")({ component: DashxStorage });

function DashxStorage() {
  const [endpoint, setEndpoint] = useState("");
  const [region, setRegion] = useState("auto");
  const [bucket, setBucket] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [secret, setSecret] = useState("");
  const [cdnBase, setCdnBase] = useState("");
  const [forcePathStyle, setForcePathStyle] = useState(true);
  const [hasSecret, setHasSecret] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    getStorageSettings()
      .then((s3) => {
        setEndpoint(s3.endpoint);
        setRegion(s3.region);
        setBucket(s3.bucket);
        setAccessKey(s3.accessKey);
        setCdnBase(s3.cdnBase);
        setForcePathStyle(s3.forcePathStyle);
        setHasSecret(s3.hasSecret);
        setConfigured(s3.configured);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await saveStorageSettings({
        data: { endpoint, region, bucket, accessKey, secret, cdnBase, forcePathStyle },
      });
      if (secret) setHasSecret(true);
      setSecret("");
      setConfigured(true);
      toast.success("Storage saved. Product files will upload to this bucket.");
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setSaving(false);
    }
  }

  async function onTest() {
    setTesting(true);
    try {
      const result = await testStorage();
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
      title="Storage"
      description="Private S3-compatible bucket for merchant uploads. Buyers never see the object key — paid orders get a short signed download."
    >
      <Card className="mb-6 p-5">
        <p className="text-sm leading-relaxed text-muted">
          Keep the bucket private. Uploads go through the app; downloads go{" "}
          <code className="rounded bg-bg px-1.5 py-0.5 text-xs text-fg">/api/files/d/…</code> which
          checks the paid order, then redirects to a 90-second signed GET on the origin (or your CDN
          hostname if the signature still matches). Works with Cloudflare R2, AWS S3, and MinIO.
        </p>
      </Card>
      <Card className="p-6">
        <form onSubmit={onSave} className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Endpoint"
            hint="R2: https://ACCOUNT.r2.cloudflarestorage.com. AWS: leave blank."
          >
            <Input
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://….r2.cloudflarestorage.com"
            />
          </Field>
          <Field label="Region" hint="R2 uses auto. AWS uses e.g. us-east-1.">
            <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="auto" />
          </Field>
          <Field label="Bucket">
            <Input value={bucket} onChange={(e) => setBucket(e.target.value)} required />
          </Field>
          <Field label="Access key">
            <Input
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              autoComplete="off"
              required
            />
          </Field>
          <Field label="Secret key" hint={hasSecret ? "Saved. Leave blank to keep it." : undefined}>
            <Input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              autoComplete="new-password"
              placeholder={hasSecret ? "••••••••" : ""}
            />
          </Field>
          <Field
            label="CDN base URL"
            hint="Optional public hostname. Delivery files still use signed URLs, never a raw public path."
          >
            <Input
              value={cdnBase}
              onChange={(e) => setCdnBase(e.target.value)}
              placeholder="https://cdn.sifalo.cloud"
            />
          </Field>
          <label className="flex h-11 items-center gap-3 text-sm text-fg sm:col-span-2">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={forcePathStyle}
              onChange={(e) => setForcePathStyle(e.target.checked)}
            />
            Force path-style URLs (on for R2 and MinIO)
          </label>
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <Button type="submit" disabled={!loaded || saving}>
              {saving ? "Saving…" : "Save storage"}
            </Button>
            <Button type="button" variant="secondary" disabled={!loaded || testing} onClick={() => void onTest()}>
              {testing ? "Checking…" : configured ? "Test connection" : "Save, then test"}
            </Button>
          </div>
        </form>
      </Card>
    </AdminPage>
  );
}
