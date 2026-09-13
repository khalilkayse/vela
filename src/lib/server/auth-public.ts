import { createServerFn } from "@tanstack/react-start";
import { SOCIAL_CATALOG } from "@/lib/auth/social-catalog";
import { enabledSocialIds } from "@/lib/auth/social.server";

export const getPublicAuthMethods = createServerFn({ method: "GET" }).handler(async () => {
  const ids = enabledSocialIds();
  return {
    social: SOCIAL_CATALOG.filter((entry) => ids.includes(entry.id)).map((entry) => ({
      id: entry.id,
      label: entry.label,
    })),
  };
});
