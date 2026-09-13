export function errMsg(error: unknown, fallback = "Something went wrong."): string {
  if (typeof error === "string" && error.trim()) return error;
  if (error instanceof Error && error.message) {
    const msg = error.message.trim();
    if (msg && msg !== "Error") return msg;
  }
  if (error && typeof error === "object") {
    const rec = error as { message?: unknown; data?: { message?: unknown }; cause?: unknown };
    if (typeof rec.message === "string" && rec.message.trim()) return rec.message;
    if (typeof rec.data?.message === "string" && rec.data.message.trim()) return rec.data.message;
    if (rec.cause) return errMsg(rec.cause, fallback);
  }
  return fallback;
}

export function isUnauthorized(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const rec = error as { status?: number; message?: string };
  return rec.status === 401 || rec.message === "Unauthorized";
}
