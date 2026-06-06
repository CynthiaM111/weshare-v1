export type PawapayEnv = "sandbox" | "production";

const SANDBOX_DEFAULT = "https://api.sandbox.pawapay.io";
const PRODUCTION_DEFAULT = "https://api.pawapay.io";

function trimBearer(token: string): string {
  let t = token.trim();
  if (t.toLowerCase().startsWith("bearer ")) t = t.slice(7).trim();
  return t;
}

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/$/, "");
}

/** Active PawaPay environment — flip in Supabase secrets to switch sandbox ↔ production. */
export function getPawapayEnv(): PawapayEnv {
  const raw = (Deno.env.get("PAWAPAY_ENV") ?? "sandbox").trim().toLowerCase();
  return raw === "production" ? "production" : "sandbox";
}

export function getPawapayConfig(): { baseUrl: string; token: string; env: PawapayEnv } {
  const env = getPawapayEnv();

  if (env === "sandbox") {
    const baseUrl = normalizeBaseUrl(
      Deno.env.get("PAWAPAY_SANDBOX_BASE_URL") ??
        Deno.env.get("PAWAPAY_BASE_URL") ??
        SANDBOX_DEFAULT
    );
    const token = trimBearer(
      Deno.env.get("PAWAPAY_SANDBOX_API_TOKEN") ?? Deno.env.get("PAWAPAY_API_TOKEN") ?? ""
    );
    if (!token) {
      throw new Error(
        "Sandbox PawaPay token missing. Set PAWAPAY_SANDBOX_API_TOKEN (or PAWAPAY_API_TOKEN) in Edge Function secrets."
      );
    }
    return { baseUrl, token, env };
  }

  const baseUrl = normalizeBaseUrl(
    Deno.env.get("PAWAPAY_PRODUCTION_BASE_URL") ??
      Deno.env.get("PAWAPAY_BASE_URL") ??
      PRODUCTION_DEFAULT
  );
  const token = trimBearer(
    Deno.env.get("PAWAPAY_PRODUCTION_API_TOKEN") ?? Deno.env.get("PAWAPAY_API_TOKEN") ?? ""
  );
  if (!token) {
    throw new Error(
      "Production PawaPay token missing. Set PAWAPAY_PRODUCTION_API_TOKEN (or PAWAPAY_API_TOKEN) in Edge Function secrets."
    );
  }
  return { baseUrl, token, env };
}
