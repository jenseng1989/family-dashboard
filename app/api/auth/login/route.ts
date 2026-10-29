import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const COOKIE_NAME = "family-dashboard-auth";

function passwordsMatch(enteredPassword: string, correctPassword: string): boolean {
  const enteredBuffer = Buffer.from(enteredPassword);
  const correctBuffer = Buffer.from(correctPassword);
  return enteredBuffer.length === correctBuffer.length && timingSafeEqual(enteredBuffer, correctBuffer);
}

function getSafeReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function getClientIp(request: NextRequest): string | null {
  // These headers must be set/overwritten by the trusted deployment proxy (Vercel).
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim();
  return ip && ip.length <= 128 ? ip : null;
}

export async function POST(request: NextRequest) {
  const dashboardPassword = process.env.DASHBOARD_PASSWORD;
  const sessionToken = process.env.DASHBOARD_SESSION_TOKEN;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!dashboardPassword || !sessionToken || !supabaseUrl || !serviceRoleKey) {
    console.error("Inloggningens serverkonfiguration är ofullständig.");
    return NextResponse.json({ error: "Inloggningen är tillfälligt otillgänglig." }, { status: 503 });
  }

  const ip = getClientIp(request);
  if (!ip) {
    return NextResponse.json({ error: "Kunde inte verifiera anslutningen." }, { status: 503 });
  }

  let body: { password?: unknown; returnTo?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig förfrågan." }, { status: 400 });
  }

  if (typeof body.password !== "string") {
    return NextResponse.json({ error: "Du måste skriva in ett lösenord." }, { status: 400 });
  }

  const isCorrect = passwordsMatch(body.password, dashboardPassword);
  // Never store raw IP addresses in the rate-limit table.
  const clientKey = createHmac("sha256", sessionToken).update(ip).digest("hex");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc("check_dashboard_login_attempt", {
    p_client_key: clientKey,
    p_password_correct: isCorrect,
  });

  if (error || !data || typeof data !== "object" || !("allowed" in data)) {
    console.error("Inloggningens försöksspärr kunde inte kontrolleras:", error?.message);
    return NextResponse.json({ error: "Inloggningen är tillfälligt otillgänglig." }, { status: 503 });
  }

  const result = data as { allowed: boolean; retry_after_seconds?: number };
  if (!result.allowed) {
    const retryAfter = Math.max(1, Math.ceil(Number(result.retry_after_seconds) || 900));
    return NextResponse.json(
      { error: "För många inloggningsförsök. Försök igen om en stund." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  if (!isCorrect) {
    return NextResponse.json({ error: "Fel lösenord." }, { status: 401 });
  }

  const response = NextResponse.json({ success: true, returnTo: getSafeReturnPath(body.returnTo) });
  response.cookies.set({
    name: COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
