export function errMsg(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}

export function isUnauthorized(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const rec = error as { status?: number; message?: string };
  return rec.status === 401 || rec.message === "Unauthorized";
}
