import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, grokOAuthEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { errMsg } from "@/lib/errors";

type Search = { next?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    next: typeof search.next === "string" ? search.next : undefined,
  }),
  component: Login,
});

function Login() {
  const { next } = Route.useSearch();
  const dest = next && next.startsWith("/") ? next : "/dashboard";
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isPending && user) {
    void navigate({ to: dest });
  }

  async function onEmail(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "reset") {
        const result = await authClient.requestPasswordReset({
          email,
          redirectTo: `${window.location.origin}/login`,
        });
        if (result.error) throw new Error(result.error.message || "Could not send reset email.");
        setNotice("If that email is registered, a reset link is on its way.");
        setBusy(false);
        return;
      }
      if (mode === "signup") {
        const result = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0],
          callbackURL: dest,
        });
        if (result.error) throw new Error(result.error.message || "Could not create account.");
        setNotice("Account created. Check your inbox if we sent a confirmation email.");
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
          callbackURL: dest,
        });
        if (result.error) throw new Error(result.error.message || "Could not sign in.");
      }
      window.location.href = dest;
    } catch (err) {
      setError(errMsg(err, "Could not sign in."));
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="inline-flex">
          <Logo />
        </Link>
        <h1 className="mt-8 font-display text-3xl tracking-tight text-fg">
          {mode === "signup" ? "Create your studio" : mode === "reset" ? "Reset password" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {mode === "signup"
            ? "Claim a unique username. That becomes your public page."
            : mode === "reset"
              ? "We’ll email a reset link if SMTP is configured in the platform."
              : "Sign in to manage your shop, products, and payouts."}
        </p>

        {authEnabled && grokOAuthEnabled ? (
          <div className="mt-8 space-y-3">
            {GROK_PROVIDERS.map((provider) => (
              <Button
                key={provider.providerId}
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => signIn(provider.providerId, { callbackURL: dest })}
              >
                Continue with {provider.label}
              </Button>
            ))}
          </div>
        ) : null}

        {authEnabled && grokOAuthEnabled ? (
        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.14em] text-subtle">
          <span className="h-px flex-1 bg-border" />
          Email
          <span className="h-px flex-1 bg-border" />
        </div>
        ) : <div className="mt-8" />}

        <form onSubmit={onEmail} className="space-y-4">
          {mode === "signup" ? (
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </Field>
          ) : null}
          <Field label="Email">
            <Input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          {mode !== "reset" ? (
          <Field label="Password">
            <Input
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          ) : null}
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {notice ? <p className="text-sm text-success">{notice}</p> : null}
          <Button type="submit" className="w-full" disabled={busy || !authEnabled}>
            {busy
              ? "Please wait…"
              : mode === "signup"
                ? "Create account"
                : mode === "reset"
                  ? "Send reset link"
                  : "Sign in"}
          </Button>
        </form>

        <div className="mt-5 flex flex-col gap-2">
          {mode !== "reset" ? (
            <button
              type="button"
              className="text-left text-sm text-muted hover:text-fg"
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setError(null);
                setNotice(null);
              }}
            >
              {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>
          ) : null}
          <button
            type="button"
            className="text-left text-sm text-muted hover:text-fg"
            onClick={() => {
              setMode(mode === "reset" ? "signin" : "reset");
              setError(null);
              setNotice(null);
            }}
          >
            {mode === "reset" ? "Back to sign in" : "Forgot password?"}
          </button>
        </div>
      </div>
    </main>
  );
}
