import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "family-dashboard-auth";
export const DASHBOARD_COOKIE_NAME = COOKIE_NAME;
export const DASHBOARD_SESSION_SECONDS = 30 * 24 * 60 * 60;

function secret(): string | null {
  return process.env.DASHBOARD_SESSION_TOKEN || null;
}
function signature(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}
export function createDashboardSession(): string {
  const key = secret();
  if (!key) throw new Error("DASHBOARD_SESSION_TOKEN saknas.");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    v: 1, iat: now, exp: now + DASHBOARD_SESSION_SECONDS,
    nonce: randomBytes(16).toString("hex"),
  })).toString("base64url");
  return `${payload}.${signature(payload, key)}`;
}
export function verifyDashboardSession(token: string | undefined): boolean {
  const key = secret();
  if (!key || !token || token.length > 2048) return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const expected = Buffer.from(signature(parts[0], key));
  const actual = Buffer.from(parts[1]);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object") return false;
    const session = parsed as Record<string, unknown>;
    const now = Math.floor(Date.now() / 1000);
    return session.v === 1 &&
      typeof session.iat === "number" && Number.isSafeInteger(session.iat) &&
      typeof session.exp === "number" && Number.isSafeInteger(session.exp) &&
      typeof session.nonce === "string" && /^[0-9a-f]{32}$/.test(session.nonce) &&
      session.iat <= now + 60 && session.exp > now &&
      session.exp > session.iat &&
      session.exp - session.iat <= DASHBOARD_SESSION_SECONDS;
  } catch {
    return false;
  }
}
export function hasDashboardSession(request: Request): boolean {
  const cookie = request.headers.get("cookie")?.split(";").map(s => s.trim())
    .find(s => s.startsWith(`${COOKIE_NAME}=`));
  if (!cookie) return false;
  try {
    return verifyDashboardSession(decodeURIComponent(cookie.slice(COOKIE_NAME.length + 1)));
  } catch {
    return false;
  }
}
