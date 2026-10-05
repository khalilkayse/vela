/**
 * Remembers, per browser, which paid articles a visitor has already
 * unlocked — so coming back without the `?access=` query param (a
 * bookmark, a link from the storefront) doesn't show the paywall again.
 * Best-effort only: private browsing, cleared site data, or a different
 * device just means the article asks to pay again, same as before this
 * existed.
 */
const PREFIX = "kart:read:";

function key(username: string, slug: string): string {
  return `${PREFIX}${username}/${slug}`;
}

export function readArticleAccess(username: string, slug: string): string | null {
  try {
    return window.localStorage.getItem(key(username, slug));
  } catch {
    return null;
  }
}

export function writeArticleAccess(username: string, slug: string, orderRef: string): void {
  try {
    window.localStorage.setItem(key(username, slug), orderRef);
  } catch {
    /* private browsing, quota, or storage disabled — unlocking still works for this visit */
  }
}
