import { createMiddleware } from "@tanstack/react-start";

/**
 * Same as authMiddleware, plus a platform-owner check.
 * Use only on /dashx server functions.
 */
export const adminMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("./client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    const { assertSameSiteRequest } = await import("./isolation.server");
    const { getSessionUser, UnauthorizedError } = await import("./verify.server");
    const { assertPlatformAdmin } = await import("@/lib/server/admin");
    assertSameSiteRequest();
    const user = await getSessionUser(context.bearerToken);
    if (!user) throw new UnauthorizedError();
    await assertPlatformAdmin(user);
    return next({ context: { userId: user.id, email: user.email } });
  });
