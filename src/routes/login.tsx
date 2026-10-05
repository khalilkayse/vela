import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, grokOAuthEnabled, signIn, signInSocial } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { errMsg } from "@/lib/errors";
import { APP_PITCH } from "@/lib/constants";
import { getPublicAuthMethods } from "@/lib/server/auth-public";

type Search = { next?: string; token?: string };

/** Only an in-app, same-origin path. `//evil.com` and `/\evil.com` both parse as off-site by browsers. */
function safeNext(next: string | undefined): string | null {
  if (!next || !next.startsWith("/")) return null;
  if (next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    next: typeof search.next === "string" ? search.next : undefined,
    // Better Auth's reset-password email links back here with ?token=... —
    // dropping it (as this route used to) meant the link could never be
    // finished.
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: Login,
});

function Login() {
  const { next, token } = Route.useSearch();
  const dest = safeNext(next) ?? "/dashboard";
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "reset" | "newPassword">(
    token ? "newPassword" : next === "/onboarding" ? "signup" : "signin",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [social, setSocial] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    getPublicAuthMethods()
      .then((result) => setSocial(result.social))
      .catch(() => setSocial([]));
  }, []);

  useEffect(() => {
    if (!isPending && user && mode !== "newPassword") {
      void navigate({ to: dest });
    }
  }, [isPending, user, mode, dest, navigate]);

  async function onEmail(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "newPassword") {
        if (!token) throw new Error("This reset link is missing its token.");
        const result = await authClient.resetPassword({ newPassword: password, token });
        if (result.error) throw new Error(result.error.message || "Could not reset password.");
        setNotice("Password updated. Sign in with it below.");
        setMode("signin");
        setPassword("");
        setBusy(false);
        return;
      }
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

  async function onSocial(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errMsg(err, "Could not sign in."));
      setBusy(false);
    }
  }

  const grokButtons = authEnabled && grokOAuthEnabled;
  const hasSocial = social.length > 0 || grokButtons;
  const showEmailForm = mode !== "newPassword" || Boolean(token);

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="inline-flex">
          <Logo />
        </Link>
        <h1 className="mt-8 font-display text-3xl font-bold tracking-tight text-fg">
          {mode === "signup"
            ? "Create your shop"
            : mode === "reset"
              ? "Reset password"
              : mode === "newPassword"
                ? "Choose a new password"
                : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {mode === "signup"
            ? "Claim a unique username. That becomes your public page."
            : mode === "reset"
              ? "We’ll email a reset link if SMTP is configured in the platform."
              : mode === "newPassword"
                ? "Set a new password for your account."
                : "Sign in to manage your shop, products, and payouts."}
        </p>

        {mode === "signin" || mode === "signup" ? (
          hasSocial ? (
            <div className="mt-8 space-y-3">
              {social.map((provider) => (
                <Button
                  key={provider.id}
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={busy}
                  onClick={() => void onSocial(() => signInSocial(provider.id, { callbackURL: dest }))}
                >
                  Continue with {provider.label}
                </Button>
              ))}
              {grokButtons
                ? GROK_PROVIDERS.map((provider) => (
                    <Button
                      key={provider.providerId}
                      type="button"
                      variant="secondary"
                      className="w-full"
                      disabled={busy}
                      onClick={() => void onSocial(() => signIn(provider.providerId, { callbackURL: dest }))}
                    >
                      Continue with {provider.label}
                    </Button>
                  ))
                : null}
            </div>
          ) : null
        ) : null}

        {(mode === "signin" || mode === "signup") && hasSocial ? (
          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.14em] text-subtle">
            <span className="h-px flex-1 bg-border" />
            Email
            <span className="h-px flex-1 bg-border" />
          </div>
        ) : (
          <div className="mt-8" />
        )}

        {showEmailForm ? (
          <form onSubmit={onEmail} className="space-y-4">
            {mode === "signup" ? (
              <Field label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </Field>
            ) : null}
            {mode !== "newPassword" ? (
              <Field label="Email">
                <Input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
            ) : null}
            {mode !== "reset" ? (
              <Field label={mode === "newPassword" ? "New password" : "Password"}>
                <Input
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === "signup" || mode === "newPassword" ? "new-password" : "current-password"}
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
                    : mode === "newPassword"
                      ? "Set new password"
                      : "Sign in"}
            </Button>
          </form>
        ) : null}

        <div className="mt-5 flex flex-col gap-2">
          {mode === "signin" || mode === "signup" ? (
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
          {mode !== "newPassword" ? (
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
          ) : null}
        </div>
        <p className="mt-10 text-xs leading-relaxed text-subtle">{APP_PITCH}</p>
      </div>
    </main>
  );
}
