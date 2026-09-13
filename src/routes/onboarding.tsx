import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Logo } from "@/components/logo";
import { LayoutSketch } from "@/components/layout-sketch";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { APP_PITCH, LAYOUTS, type ShopLayout } from "@/lib/constants";
import { errMsg } from "@/lib/errors";
import { createShop, getMyShop } from "@/lib/server/shops";
import { UsernameField } from "@/components/username-field";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

function Onboarding() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [tagline, setTagline] = useState("");
  const [layout, setLayout] = useState<ShopLayout>("hybrid");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    if (!user) return;
    getMyShop()
      .then((shop) => {
        if (shop) void navigate({ to: "/dashboard" });
      })
      .catch(() => undefined);
  }, [user, navigate]);

  if (isPending) {
    return <div className="min-h-screen bg-bg" />;
  }
  if (!user) return <RedirectToSignIn />;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createShop({
        data: { username, displayName, tagline, layout },
      });
      await navigate({ to: "/dashboard" });
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  }

  const selected = LAYOUTS.find((option) => option.id === layout) ?? LAYOUTS[0];

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-12 lg:grid lg:grid-cols-[1fr_0.9fr] lg:items-start lg:gap-16 lg:py-20">
      <div>
        <Logo />
        <h1 className="mt-8 font-display text-4xl font-bold tracking-tight text-fg">Open your shop</h1>
        <p className="mt-2 text-sm text-muted">
          This becomes your public URL. Usernames are unique — {origin || "your domain"}/{username || "you"}.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <Field label="Display name">
            <Input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Maya Atelier"
            />
          </Field>
          <UsernameField value={username} onChange={setUsername} origin={origin} />
          <Field label="Tagline">
            <Input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Brand systems for independent makers"
              maxLength={120}
            />
          </Field>
          <div>
            <p className="mb-2 text-sm font-medium text-fg">Page layout</p>
            <div className="grid gap-2">
              {LAYOUTS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setLayout(option.id)}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-left",
                    layout === option.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-surface hover:bg-bg",
                  )}
                >
                  <span className="block text-sm font-medium text-fg">{option.label}</span>
                  <span className="text-xs text-muted">{option.hint}</span>
                </button>
              ))}
            </div>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            {busy ? "Creating…" : "Create shop"}
          </Button>
        </form>
        <p className="mt-8 text-xs text-subtle">{APP_PITCH}</p>
      </div>
      <aside className="mt-12 hidden lg:sticky lg:top-24 lg:mt-0 lg:block">
        <LayoutSketch layout={layout} className="h-72 p-5" />
        <p className="mt-4 font-display text-2xl font-bold tracking-tight text-fg">{selected.label}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{selected.hint}</p>
      </aside>
    </main>
  );
}
