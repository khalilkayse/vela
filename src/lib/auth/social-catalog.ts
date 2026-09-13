/**
 * Direct social sign-in (Better Auth socialProviders), independent of the Grok broker.
 * Buttons render only when BOTH env vars are set on the server.
 */
export type SocialCatalogEntry = {
  id: "google" | "github" | "twitter" | "discord" | "facebook" | "apple" | "microsoft";
  label: string;
  clientEnv: string;
  secretEnv: string;
  extraEnv?: { name: string; hint: string }[];
  callbackPath: string;
  consoleUrl: string;
  notes: string;
};

export const SOCIAL_CATALOG: readonly SocialCatalogEntry[] = [
  {
    id: "google",
    label: "Google",
    clientEnv: "GOOGLE_CLIENT_ID",
    secretEnv: "GOOGLE_CLIENT_SECRET",
    callbackPath: "/api/auth/callback/google",
    consoleUrl: "https://console.cloud.google.com/apis/credentials",
    notes: "Create an OAuth 2.0 Client ID (Web application). Add the callback URL under Authorized redirect URIs. Enable the Google+ / People API if Google asks.",
  },
  {
    id: "github",
    label: "GitHub",
    clientEnv: "GITHUB_CLIENT_ID",
    secretEnv: "GITHUB_CLIENT_SECRET",
    callbackPath: "/api/auth/callback/github",
    consoleUrl: "https://github.com/settings/developers",
    notes: "New OAuth App. Homepage is your public origin. Authorization callback URL is the path below.",
  },
  {
    id: "twitter",
    label: "X",
    clientEnv: "TWITTER_CLIENT_ID",
    secretEnv: "TWITTER_CLIENT_SECRET",
    callbackPath: "/api/auth/callback/twitter",
    consoleUrl: "https://developer.x.com/en/portal/dashboard",
    notes: "OAuth 2.0 app. User authentication, confidential client. Callback URL must match exactly. Request email if you want a real address.",
  },
  {
    id: "discord",
    label: "Discord",
    clientEnv: "DISCORD_CLIENT_ID",
    secretEnv: "DISCORD_CLIENT_SECRET",
    callbackPath: "/api/auth/callback/discord",
    consoleUrl: "https://discord.com/developers/applications",
    notes: "OAuth2 → Redirects. Add the callback URL. Scopes identify + email are requested automatically.",
  },
  {
    id: "facebook",
    label: "Facebook",
    clientEnv: "FACEBOOK_CLIENT_ID",
    secretEnv: "FACEBOOK_CLIENT_SECRET",
    callbackPath: "/api/auth/callback/facebook",
    consoleUrl: "https://developers.facebook.com/apps",
    notes: "Facebook Login for Web. Add the callback as a Valid OAuth Redirect URI. App must be live (or you in a test role) to work for others.",
  },
  {
    id: "apple",
    label: "Apple",
    clientEnv: "APPLE_CLIENT_ID",
    secretEnv: "APPLE_CLIENT_SECRET",
    extraEnv: [
      {
        name: "APPLE_APP_BUNDLE_IDENTIFIER",
        hint: "Optional. iOS bundle id if you also sign in from an Apple app.",
      },
    ],
    callbackPath: "/api/auth/callback/apple",
    consoleUrl: "https://developer.apple.com/account/resources/identifiers/list/serviceId",
    notes: "Services ID as APPLE_CLIENT_ID. APPLE_CLIENT_SECRET is a JWT you generate from a .p8 key (team id, key id, private key). Return URL must be HTTPS.",
  },
  {
    id: "microsoft",
    label: "Microsoft",
    clientEnv: "MICROSOFT_CLIENT_ID",
    secretEnv: "MICROSOFT_CLIENT_SECRET",
    extraEnv: [
      {
        name: "MICROSOFT_TENANT_ID",
        hint: "Optional. Defaults to common (any Microsoft account).",
      },
    ],
    callbackPath: "/api/auth/callback/microsoft",
    consoleUrl: "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps",
    notes: "App registration, Web redirect URI = callback. Certificates & secrets → new client secret.",
  },
] as const;

export type SocialProviderId = (typeof SOCIAL_CATALOG)[number]["id"];
