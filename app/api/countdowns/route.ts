import { hasDashboardSession } from "@/lib/dashboard-session";
import { NextRequest, NextResponse } from "next/server";
import { getResorSupabase } from "@/lib/supabase-resor-server";
export const dynamic = "force-dynamic";
const COOKIE_NAME = "family-dashboard-auth";
function authorized(request: NextRequest): boolean {

  return hasDashboardSession(request);
}
function forbidden() { return NextResponse.json({ error: "Obehörig" }, { status: 401 }); }
function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  if (!host) return false;
  try { const url = new URL(origin); return url.host === host && url.protocol === `${proto}:`; }
  catch { return false; }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10) === value;
}
export async function GET(request: NextRequest) {
  if (!authorized(request)) return forbidden();
  const upcoming = request.nextUrl.searchParams.get("upcoming") === "true";
  try {
    let query = getResorSupabase().from("countdowns").select("id, title, event_date, created_at");
    if (upcoming) {
      const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      query = query.gte("event_date", today);
    }
    const { data, error } = await query.order("event_date", { ascending: true }).order("created_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ events: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { console.error("Countdown GET:", error); return NextResponse.json({ error: "Kunde inte hämta nedräkningar" }, { status: 500 }); }
}
export async function POST(request: NextRequest) {
  if (!authorized(request)) return forbidden();
  if (!sameOrigin(request)) return NextResponse.json({ error: "Ogiltigt ursprung" }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 }); }
  if (!body || typeof body !== "object" || !("title" in body) || !("event_date" in body)) return NextResponse.json({ error: "Ogiltiga uppgifter" }, { status: 400 });
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 60 || !validDate(body.event_date)) return NextResponse.json({ error: "Ogiltig titel eller datum" }, { status: 400 });
  try {
    const { data, error } = await getResorSupabase().from("countdowns").insert({ title, event_date: body.event_date }).select("id, title, event_date, created_at").single();
    if (error) throw error;
    return NextResponse.json({ event: data }, { status: 201 });
  } catch (error) { console.error("Countdown POST:", error); return NextResponse.json({ error: "Kunde inte spara nedräkningen" }, { status: 500 }); }
}
export async function DELETE(request: NextRequest) {
  if (!authorized(request)) return forbidden();
  if (!sameOrigin(request)) return NextResponse.json({ error: "Ogiltigt ursprung" }, { status: 403 });
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!UUID.test(id)) return NextResponse.json({ error: "Ogiltigt id" }, { status: 400 });
  try {
    const { error } = await getResorSupabase().from("countdowns").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) { console.error("Countdown DELETE:", error); return NextResponse.json({ error: "Kunde inte ta bort nedräkningen" }, { status: 500 }); }
}
