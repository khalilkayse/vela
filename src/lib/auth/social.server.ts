import { SOCIAL_CATALOG, type SocialProviderId } from "./social-catalog";

function env(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

export function enabledSocialIds(): SocialProviderId[] {
  return SOCIAL_CATALOG.filter((entry) => env(entry.clientEnv) && env(entry.secretEnv)).map(
    (entry) => entry.id,
  );
}

export function buildSocialProviders(): {
  google?: { clientId: string; clientSecret: string };
  github?: { clientId: string; clientSecret: string };
  twitter?: { clientId: string; clientSecret: string };
  discord?: { clientId: string; clientSecret: string };
  facebook?: { clientId: string; clientSecret: string };
  apple?: { clientId: string; clientSecret: string; appBundleIdentifier?: string };
  microsoft?: { clientId: string; clientSecret: string; tenantId?: string };
} {
  const out: ReturnType<typeof buildSocialProviders> = {};
  const googleId = env("GOOGLE_CLIENT_ID");
  const googleSecret = env("GOOGLE_CLIENT_SECRET");
  if (googleId && googleSecret) out.google = { clientId: googleId, clientSecret: googleSecret };

  const githubId = env("GITHUB_CLIENT_ID");
  const githubSecret = env("GITHUB_CLIENT_SECRET");
  if (githubId && githubSecret) out.github = { clientId: githubId, clientSecret: githubSecret };

  const twitterId = env("TWITTER_CLIENT_ID");
  const twitterSecret = env("TWITTER_CLIENT_SECRET");
  if (twitterId && twitterSecret) out.twitter = { clientId: twitterId, clientSecret: twitterSecret };

  const discordId = env("DISCORD_CLIENT_ID");
  const discordSecret = env("DISCORD_CLIENT_SECRET");
  if (discordId && discordSecret) out.discord = { clientId: discordId, clientSecret: discordSecret };

  const facebookId = env("FACEBOOK_CLIENT_ID");
  const facebookSecret = env("FACEBOOK_CLIENT_SECRET");
  if (facebookId && facebookSecret) {
    out.facebook = { clientId: facebookId, clientSecret: facebookSecret };
  }

  const appleId = env("APPLE_CLIENT_ID");
  const appleSecret = env("APPLE_CLIENT_SECRET");
  if (appleId && appleSecret) {
    out.apple = {
      clientId: appleId,
      clientSecret: appleSecret,
      ...(env("APPLE_APP_BUNDLE_IDENTIFIER")
        ? { appBundleIdentifier: env("APPLE_APP_BUNDLE_IDENTIFIER") }
        : {}),
    };
  }

  const microsoftId = env("MICROSOFT_CLIENT_ID");
  const microsoftSecret = env("MICROSOFT_CLIENT_SECRET");
  if (microsoftId && microsoftSecret) {
    out.microsoft = {
      clientId: microsoftId,
      clientSecret: microsoftSecret,
      tenantId: env("MICROSOFT_TENANT_ID") || "common",
    };
  }

  return out;
}
