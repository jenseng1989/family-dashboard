import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { hasDashboardSession } from "@/lib/dashboard-session";
import { getResorSupabase } from "@/lib/supabase-resor-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const HEADERS = { "Cache-Control": "no-store" };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: HEADERS });
const uuid = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

function secureEqual(a: string, b: string): boolean {
  const x = createHash("sha256").update(a).digest();
  const y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
}

function androidMember(request: NextRequest): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer ([A-Za-z0-9_-]{32,256})$/.exec(header);
  const token = process.env.HEALTH_SYNC_JENS_TOKEN;
  const member = process.env.HEALTH_SYNC_JENS_MEMBER_ID;
  if (!match || !token || !uuid(member) || !secureEqual(match[1], token)) return null;
  return member;
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function GET(request: NextRequest) {
  if (!hasDashboardSession(request)) return fail("Du måste vara inloggad.", 401);
  const memberId = request.nextUrl.searchParams.get("memberId");
  if (!uuid(memberId)) return fail("Ogiltig familjemedlem.", 400);
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  if (!validDate(from) || !validDate(to) || from > to ||
      (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000 > 366) {
    return fail("Ange ett giltigt datumintervall på högst 366 dagar.", 400);
  }
  try {
    const { data, error } = await getResorSupabase().from("family_daily_steps")
      .select("date,steps,source,updated_at")
      .eq("family_member_id", memberId).gte("date", from).lte("date", to)
      .order("date", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ days: data ?? [] }, { headers: HEADERS });
  } catch (error) {
    console.error("Health steps GET failed", error);
    return fail("Kunde inte hämta stegdata.", 500);
  }
}

export async function POST(request: NextRequest) {
  const memberId = androidMember(request);
  if (!memberId) return fail("Ogiltig synkroniseringsbehörighet.", 401);
  if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
    return fail("JSON krävs.", 415);
  }
  if (Number(request.headers.get("content-length") ?? 0) > 4096) return fail("För stor begäran.", 413);
  let body: unknown;
  try { body = await request.json(); } catch { return fail("Ogiltig JSON.", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return fail("Ogiltiga uppgifter.", 400);
  const input = body as Record<string, unknown>;
  if (!validDate(input.date) || !Number.isSafeInteger(input.steps) ||
      (input.steps as number) < 0 || (input.steps as number) > 150000) {
    return fail("Ogiltigt datum eller stegantal.", 400);
  }
  // Datum beräknas av telefonen i dess lokala tidszon. Tillåt två dagars eftersläpning.
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" });
  const diff = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${input.date}T00:00:00Z`)) / 86400000;
  if (diff < -1 || diff > 2) return fail("Datum ligger utanför synkroniseringsfönstret.", 400);
  try {
    const db = getResorSupabase();
    const member = await db.from("family_members").select("id,is_active").eq("id", memberId).maybeSingle();
    if (member.error) throw member.error;
    if (!member.data?.is_active) return fail("Familjemedlemmen är inte aktiv.", 403);
    const { data, error } = await db.from("family_daily_steps")
      .upsert({ family_member_id: memberId, date: input.date, steps: input.steps,
        source: "health_connect", updated_at: new Date().toISOString() },
        { onConflict: "family_member_id,date,source" })
      .select("date,steps,source,updated_at").single();
    if (error) throw error;
    return NextResponse.json({ success: true, day: data }, { headers: HEADERS });
  } catch (error) {
    console.error("Health steps POST failed", error);
    return fail("Kunde inte spara stegdata.", 500);
  }
}
