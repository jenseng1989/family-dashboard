import { NextRequest, NextResponse } from "next/server";
import { getResorSupabase } from "@/lib/supabase-resor-server";

export const dynamic = "force-dynamic";
const TABLE = "resor_day_notes";
const fields = "id,trip_id,note_date,title,body,created_at";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers = { "Cache-Control": "no-store" };
function fail(message: string, status: number) { return NextResponse.json({ error: message }, { status, headers }); }
function authorize(request: NextRequest, write = false): NextResponse | null {
  const token = process.env.DASHBOARD_SESSION_TOKEN;
  if (!token || request.cookies.get("family-dashboard-auth")?.value !== token) return fail("Du måste vara inloggad.", 401);
  if (write) {
    if (request.headers.get("origin") !== request.nextUrl.origin) return fail("Otillåtet ursprung.", 403);
    if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return fail("Begäran måste innehålla JSON.", 415);
  }
  return null;
}
function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T12:00:00Z`)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}
export async function GET(request: NextRequest) {
  const denied = authorize(request); if (denied) return denied;
  const tripId = request.nextUrl.searchParams.get("tripId");
  if (!tripId || !uuid.test(tripId)) return fail("Ogiltigt rese-ID.", 400);
  try {
    const { data, error } = await getResorSupabase().from(TABLE).select(fields).eq("trip_id", tripId).order("created_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ notes: data ?? [] }, { headers });
  } catch (error) { console.error("Resor daganteckningar GET:", error); return fail("Kunde inte hämta anteckningarna.", 500); }
}
export async function POST(request: NextRequest) {
  const denied = authorize(request, true); if (denied) return denied;
  let body: unknown; try { body = await request.json(); } catch { return fail("Ogiltig JSON.", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return fail("Ogiltiga uppgifter.", 400);
  const { trip_id, note_date, title, body: noteBody } = body as Record<string, unknown>;
  if (typeof trip_id !== "string" || !uuid.test(trip_id)) return fail("Ogiltigt rese-ID.", 400);
  if (note_date !== null && !validDate(note_date)) return fail("Ogiltigt datum.", 400);
  if (typeof title !== "string" || !title.trim() || title.length > 160) return fail("Ogiltig rubrik.", 400);
  if (typeof noteBody !== "string" || noteBody.length > 3000) return fail("Ogiltig anteckning.", 400);
  try {
    const db = getResorSupabase();
    const trip = await db.from("resor_trips").select("id").eq("id", trip_id).maybeSingle();
    if (trip.error) throw trip.error;
    if (!trip.data) return fail("Resan hittades inte.", 404);
    const { data, error } = await db.from(TABLE).insert({ trip_id, note_date, title: title.trim(), body: noteBody.trim() }).select(fields).single();
    if (error) throw error;
    return NextResponse.json({ note: data }, { status: 201, headers });
  } catch (error) { console.error("Resor daganteckningar POST:", error); return fail("Kunde inte spara anteckningen.", 500); }
}
export async function DELETE(request: NextRequest) {
  const denied = authorize(request, true); if (denied) return denied;
  let body: unknown; try { body = await request.json(); } catch { return fail("Ogiltig JSON.", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return fail("Ogiltiga uppgifter.", 400);
  const { id, trip_id } = body as Record<string, unknown>;
  if (typeof id !== "string" || !uuid.test(id) || typeof trip_id !== "string" || !uuid.test(trip_id)) return fail("Ogiltigt ID.", 400);
  try {
    const { data, error } = await getResorSupabase().from(TABLE).delete().eq("id", id).eq("trip_id", trip_id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return fail("Anteckningen hittades inte.", 404);
    return NextResponse.json({ success: true }, { headers });
  } catch (error) { console.error("Resor daganteckningar DELETE:", error); return fail("Kunde inte ta bort anteckningen.", 500); }
}
