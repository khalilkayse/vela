import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { LAYOUTS, type ShopLayout } from "@/lib/constants";
import { errMsg } from "@/lib/errors";
import { createShop, getMyShop } from "@/lib/server/shops";
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

  return (
    <main className="mx-auto grid min-h-screen max-w-lg place-content-center px-4 py-16">
      <Logo />
      <h1 className="mt-8 font-display text-4xl tracking-tight text-fg">Open your shop</h1>
      <p className="mt-2 text-sm text-muted">
        This becomes your public URL. You can change the name later. The username is harder to move.
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
        <Field label="Username" hint="vela.app/you — 3 to 24 letters, numbers, or hyphens.">
          <div className="flex overflow-hidden rounded-md border border-border bg-surface focus-within:ring-2 focus-within:ring-ring/40">
            <span className="grid place-items-center bg-bg px-3 text-sm text-muted">/</span>
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="h-11 flex-1 bg-transparent px-3 text-sm text-fg outline-none"
              placeholder="maya"
            />
          </div>
        </Field>
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
    </main>
  );
}
