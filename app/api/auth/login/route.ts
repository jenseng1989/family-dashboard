import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getResorSupabase } from "@/lib/supabase-resor-server";
import { createDashboardSession, DASHBOARD_SESSION_SECONDS } from "@/lib/dashboard-session";

const COOKIE_NAME = "family-dashboard-auth";
const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

function passwordsMatch(enteredPassword: string, correctPassword: string): boolean {
  const enteredBuffer = Buffer.from(enteredPassword);
  const correctBuffer = Buffer.from(correctPassword);
  return enteredBuffer.length === correctBuffer.length &&
    timingSafeEqual(enteredBuffer, correctBuffer);
}

function getSafeReturnPath(value: unknown): string {
  if (typeof value !== "string" || value.length > 2048) return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  // Undvik kontrolltecken, radbrytningar och kodade snedstreck/backslash.
  if (/[\u0000-\u001f\u007f]/.test(value) || /%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(value)) return "/";
  try {
    const parsed = new URL(value, "https://dashboard.local");
    if (parsed.origin !== "https://dashboard.local") return "/";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}

function hasSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const supplied = new URL(origin);
    const target = new URL(request.url);
    return supplied.origin === target.origin;
  } catch {
    return false;
  }
}

function clientKey(request: NextRequest, secret: string): string {
  // Vercels proxy sätter denna header. Om den saknas används en gemensam
  // reservnyckel, aldrig en godtycklig header som klienten själv kan styra.
  const forwarded = request.headers.get("x-vercel-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown-client";
  return createHmac("sha256", secret).update(ip).digest("hex");
}

function errorResponse(message: string, status: number, retryAfter?: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}),
      },
    }
  );
}

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) return errorResponse("Otillåtet ursprung.", 403);
  const dashboardPassword = process.env.DASHBOARD_PASSWORD;
  const sessionToken = process.env.DASHBOARD_SESSION_TOKEN;
  if (!dashboardPassword || !sessionToken) {
    console.error("DASHBOARD_PASSWORD eller DASHBOARD_SESSION_TOKEN saknas.");
    return errorResponse("Lösenordsskyddet är inte korrekt konfigurerat.", 500);
  }

  let body: { password?: unknown; returnTo?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Ogiltig förfrågan.", 400);
  }
  if (typeof body.password !== "string") {
    return errorResponse("Du måste skriva in ett lösenord.", 400);
  }

  const valid = passwordsMatch(body.password, dashboardPassword);
  try {
    const { data, error } = await getResorSupabase().rpc(
      "dashboard_register_login_attempt",
      {
        p_client_key: clientKey(request, sessionToken),
        p_password_valid: valid,
        p_max_attempts: MAX_ATTEMPTS,
        p_window_minutes: WINDOW_MINUTES,
      }
    );
    if (error || !Array.isArray(data) || data.length !== 1) {
      console.error("Inloggningsbegränsning kunde inte verifieras:", error);
      return errorResponse("Inloggningen är tillfälligt otillgänglig. Försök igen senare.", 503);
    }
    const outcome = data[0] as { allowed?: boolean; retry_after_seconds?: number };
    if (outcome.retry_after_seconds && outcome.retry_after_seconds > 0) {
      return errorResponse(
        "För många misslyckade försök. Försök igen om en stund.",
        429,
        outcome.retry_after_seconds
      );
    }
    if (!outcome.allowed || !valid) {
      return errorResponse("Fel lösenord.", 401);
    }
  } catch (error) {
    console.error("Inloggningsbegränsning misslyckades:", error);
    return errorResponse("Inloggningen är tillfälligt otillgänglig. Försök igen senare.", 503);
  }

  const response = NextResponse.json({
    success: true,
    returnTo: getSafeReturnPath(body.returnTo),
  }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set({
    name: COOKIE_NAME,
    value: createDashboardSession(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DASHBOARD_SESSION_SECONDS,
  });
  return response;
}
