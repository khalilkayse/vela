import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AdminPage } from "@/components/dashx-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { getSmtpSettings, saveSmtpSettings, sendTestEmail } from "@/lib/server/admin";
import { errMsg } from "@/lib/errors";

export const Route = createFileRoute("/dashx/mail")({ component: DashxMail });

function DashxMail() {
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("Vela");
  const [secure, setSecure] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    getSmtpSettings()
      .then((smtp) => {
        setHost(smtp.host);
        setPort(String(smtp.port));
        setUser(smtp.user);
        setFromEmail(smtp.fromEmail);
        setFromName(smtp.fromName);
        setSecure(smtp.secure);
        setHasPassword(smtp.hasPassword);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await saveSmtpSettings({
        data: {
          host,
          port: Number(port) || 587,
          user,
          pass,
          fromEmail,
          fromName,
          secure,
        },
      });
      if (pass) setHasPassword(true);
      setPass("");
      toast.success("SMTP saved. Sign-up confirmation and shop welcome emails will use this.");
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setSaving(false);
    }
  }

  async function onTest() {
    setTesting(true);
    try {
      const result = await sendTestEmail();
      toast.success(`Test sent to ${result.to}`);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setTesting(false);
    }
  }

  return (
    <AdminPage
      title="Email"
      description="SMTP for confirmation, password reset, and the shop welcome note. Leave empty until you are ready — sign-up still works."
    >
      <Card className="p-6">
        <form onSubmit={onSave} className="grid gap-4 sm:grid-cols-2">
          <Field label="Host">
            <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.example.com" required />
          </Field>
          <Field label="Port">
            <Input value={port} onChange={(e) => setPort(e.target.value)} inputMode="numeric" />
          </Field>
          <Field label="Username">
            <Input value={user} onChange={(e) => setUser(e.target.value)} autoComplete="off" />
          </Field>
          <Field label="Password" hint={hasPassword ? "Saved. Leave blank to keep it." : undefined}>
            <Input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete="new-password"
              placeholder={hasPassword ? "••••••••" : ""}
            />
          </Field>
          <Field label="From email">
            <Input type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} required />
          </Field>
          <Field label="From name">
            <Input value={fromName} onChange={(e) => setFromName(e.target.value)} />
          </Field>
          <label className="flex h-11 items-center gap-3 text-sm text-fg sm:col-span-2">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={secure}
              onChange={(e) => setSecure(e.target.checked)}
            />
            Use TLS (port 465)
          </label>
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <Button type="submit" disabled={!loaded || saving}>
              {saving ? "Saving…" : "Save SMTP"}
            </Button>
            <Button type="button" variant="secondary" disabled={!loaded || testing} onClick={() => void onTest()}>
              {testing ? "Sending…" : "Send test"}
            </Button>
          </div>
        </form>
      </Card>
    </AdminPage>
  );
}
