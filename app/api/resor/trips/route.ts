import { NextRequest, NextResponse } from "next/server";
import { getResorSupabase } from "@/lib/supabase-resor-server";

export const dynamic = "force-dynamic";
const TABLE = "resor_trips";
const COOKIE_NAME = "family-dashboard-auth";
const statuses = ["upcoming", "idea", "past"] as const;
type Status = (typeof statuses)[number];
type Payload = {
  title: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  description: string;
  status: Status;
};
const fields = "id,title,destination,start_date,end_date,description,status,created_at";
const noCache = { "Cache-Control": "no-store" };

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: noCache });
}

// Behörigheten kontrolleras också här, inte enbart i proxy.ts.
function authorize(request: NextRequest, mutation = false): NextResponse | null {
  const sessionToken = process.env.DASHBOARD_SESSION_TOKEN;
  if (!sessionToken || request.cookies.get(COOKIE_NAME)?.value !== sessionToken) {
    return fail("Du måste vara inloggad för att hantera resor.", 401);
  }
  if (mutation) {
    // Skyddar cookie-autentiserade skrivningar från cross-site-anrop.
    const origin = request.headers.get("origin");
    if (!origin || origin !== request.nextUrl.origin) {
      return fail("Otillåtet ursprung för begäran.", 403);
    }
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
      return fail("Begäran måste innehålla JSON.", 415);
    }
  }
  return null;
}

function parse(value: unknown): Payload | string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Ogiltiga uppgifter.";
  const v = value as Record<string, unknown>;
  const title = typeof v.title === "string" ? v.title.trim() : "";
  const destination = typeof v.destination === "string" ? v.destination.trim() : "";
  const description = typeof v.description === "string" ? v.description.trim() : "";
  const status = v.status;
  const start_date = v.start_date === "" || v.start_date == null ? null : v.start_date;
  const end_date = v.end_date === "" || v.end_date == null ? null : v.end_date;
  const validDate = (d: unknown): d is string | null =>
    d === null || (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) &&
      !Number.isNaN(Date.parse(`${d}T12:00:00Z`)) &&
      new Date(`${d}T12:00:00Z`).toISOString().slice(0, 10) === d);
  if (!title || title.length > 120) return "Ange ett namn (högst 120 tecken).";
  if (!destination || destination.length > 120) return "Ange ett resmål (högst 120 tecken).";
  if (description.length > 2000) return "Beskrivningen är för lång.";
  if (!statuses.includes(status as Status)) return "Ogiltig resestatus.";
  if (!validDate(start_date) || !validDate(end_date)) return "Ogiltigt datum.";
  if (start_date && end_date && end_date < start_date) return "Slutdatum kan inte vara före startdatum.";
  return { title, destination, description, status: status as Status, start_date, end_date };
}

function db() { return getResorSupabase().from(TABLE); }

export async function GET(request: NextRequest) {
  const denied = authorize(request);
  if (denied) return denied;
  try {
    const { data, error } = await db().select(fields).order("created_at", { ascending: false });
    if (error) { console.error("Resor GET:", error); return fail("Kunde inte läsa resor.", 500); }
    return NextResponse.json({ trips: data ?? [] }, { headers: noCache });
  } catch (error) { console.error("Resor GET:", error); return fail("Serverkonfigurationen för Resor saknas eller är felaktig.", 500); }
}

export async function POST(request: NextRequest) {
  const denied = authorize(request, true);
  if (denied) return denied;
  let body: unknown;
  try { body = await request.json(); } catch { return fail("Ogiltig JSON.", 400); }
  const payload = parse(body);
  if (typeof payload === "string") return fail(payload, 400);
  try {
    const { data, error } = await db().insert(payload).select(fields).single();
    if (error) { console.error("Resor POST:", error); return fail("Kunde inte spara resan.", 500); }
    return NextResponse.json({ trip: data }, { status: 201, headers: noCache });
  } catch (error) { console.error("Resor POST:", error); return fail("Serverkonfigurationen för Resor saknas eller är felaktig.", 500); }
}

export async function PUT(request: NextRequest) {
  const denied = authorize(request, true);
  if (denied) return denied;
  let body: unknown;
  try { body = await request.json(); } catch { return fail("Ogiltig JSON.", 400); }
  const input = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : null;
  if (typeof input?.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(input.id)) return fail("Ogiltigt rese-ID.", 400);
  const payload = parse(input);
  if (typeof payload === "string") return fail(payload, 400);
  try {
    const { data, error } = await db().update(payload).eq("id", input.id).select(fields).maybeSingle();
    if (error) { console.error("Resor PUT:", error); return fail("Kunde inte uppdatera resan.", 500); }
    if (!data) return fail("Resan hittades inte.", 404);
    return NextResponse.json({ trip: data }, { headers: noCache });
  } catch (error) { console.error("Resor PUT:", error); return fail("Serverkonfigurationen för Resor saknas eller är felaktig.", 500); }
}

export async function DELETE(request: NextRequest) {
  const denied = authorize(request, true);
  if (denied) return denied;
  let body: unknown;
  try { body = await request.json(); } catch { return fail("Ogiltig JSON.", 400); }
  const input = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : null;
  if (typeof input?.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(input.id)) return fail("Ogiltigt rese-ID.", 400);
  try {
    const { data, error } = await db().delete().eq("id", input.id).select("id").maybeSingle();
    if (error) { console.error("Resor DELETE:", error); return fail("Kunde inte ta bort resan.", 500); }
    if (!data) return fail("Resan hittades inte.", 404);
    return NextResponse.json({ success: true }, { headers: noCache });
  } catch (error) { console.error("Resor DELETE:", error); return fail("Serverkonfigurationen för Resor saknas eller är felaktig.", 500); }
}
