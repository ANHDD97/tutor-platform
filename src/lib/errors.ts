export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;

  if (typeof err === "object" && err !== null && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }

  if (typeof err === "string") return err;

  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}
