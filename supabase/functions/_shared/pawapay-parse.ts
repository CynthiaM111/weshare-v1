/** Parse status from PawaPay v2 GET deposit/payout responses (FOUND wrapper). */
export function parsePawapayEntityStatus(data: Record<string, unknown>): string {
  const wrapperStatus = data.status as string | undefined;
  if (wrapperStatus === "FOUND" && data.data && typeof data.data === "object") {
    const inner = data.data as Record<string, unknown>;
    return (inner.status as string) ?? "UNKNOWN";
  }
  if (wrapperStatus === "NOT_FOUND") return "NOT_FOUND";
  return (data.data as Record<string, unknown> | undefined)?.status as string ??
    wrapperStatus ??
    "UNKNOWN";
}
