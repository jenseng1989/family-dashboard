import { NextRequest, NextResponse } from "next/server";
import { getResorSupabase } from "@/lib/supabase-resor-server";

export const dynamic = "force-dynamic";
const TABLE = "resor_activities";
const fields = "id,trip_id,name,kind,location,activity_date,start_time,cost_sek,notes,created_at";
const noCache = { "Cache-Control": "no-store" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function fail(message: string, status: number) { return NextResponse.json({ error: message }, { status, headers: noCache }); }
function authorize(request: NextRequest, mutation = false): NextResponse | null {
  const token = process.env.DASHBOARD_SESSION_TOKEN;
  if (!token || request.cookies.get("family-dashboard-auth")?.value !== token) return fail("Du måste vara inloggad.", 401);
  if (mutation) {
    const origin = request.headers.get("origin");
    if (!origin || origin !== request.nextUrl.origin) return fail("Otillåtet ursprung.", 403);
    if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return fail("Begäran måste innehålla JSON.", 415);
  }
  return null;
}
type Payload = {
  trip_id: string; name: string; kind: string; location: string;
  activity_date: string | null; start_time: string | null;
  cost_sek: number | null; notes: string;
};
type Parsed = { payload: Payload; error?: never } | { error: string; payload?: never };
const activityKinds = ["sightseeing", "nature", "food", "culture", "adventure", "other"] as const;
function parse(value: unknown): Parsed {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { error: "Ogiltiga uppgifter." };
  const v = value as Record<string, unknown>;
  if (typeof v.trip_id !== "string" || !uuid.test(v.trip_id)) return { error: "Ogiltigt rese-ID." };
  if (!activityKinds.includes(v.kind as typeof activityKinds[number])) return { error: "Ogiltig aktivitetstyp." };
  const limits = { name: 160, location: 300, notes: 2000 };
  const strings: Record<string, string> = {};
  for (const key of Object.keys(limits) as (keyof typeof limits)[]) {
    if (typeof v[key] !== "string" || v[key].length > limits[key]) return { error: `Ogiltigt fält: ${key}.` };
    strings[key] = v[key].trim();
  }
  if (!strings.name) return { error: "Ange aktivitetens namn." };
  const date = v.activity_date;
  if (date !== null && (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0,10) !== date)) return { error: "Ogiltigt datum." };
  const time = v.start_time;
  if (time !== null && (typeof time !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time))) return { error: "Ogiltig tid." };
  const cost = v.cost_sek;
  if (cost !== null && (typeof cost !== "number" || !Number.isFinite(cost) || cost < 0 || cost > 100000000 || Math.round(cost * 100) !== cost * 100)) return { error: "Ogiltig kostnad." };
  return { payload: {
    trip_id: v.trip_id, name: strings.name, kind: v.kind as string,
    location: strings.location, notes: strings.notes,
    activity_date: date as string | null, start_time: time as string | null,
    cost_sek: cost as number | null,
  }};
}
async function tripExists(tripId: string) {
  const { data, error } = await getResorSupabase().from("resor_trips").select("id").eq("id", tripId).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
export async function GET(request: NextRequest) {
  const denied = authorize(request); if (denied) return denied;
  const tripId = request.nextUrl.searchParams.get("tripId");
  if (!tripId || !uuid.test(tripId)) return fail("Ogiltigt rese-ID.", 400);
  try {
    const { data, error } = await getResorSupabase().from(TABLE).select(fields).eq("trip_id", tripId).order("created_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ activities: data ?? [] }, { headers: noCache });
  } catch (error) { console.error("Resor aktiviteter GET:", error); return fail("Kunde inte läsa aktiviteter. Kontrollera att SQL-scriptet är kört.", 500); }
}
export async function POST(request: NextRequest) {
  const denied = authorize(request, true); if (denied) return denied;
  let body: unknown; try { body = await request.json(); } catch { return fail("Ogiltig JSON.", 400); }
  const result = parse(body); if ("error" in result) return fail(result.error ?? "Ogiltiga aktivitetsuppgifter.", 400);
  try {
    if (!await tripExists(result.payload.trip_id)) return fail("Resan hittades inte.", 404);
    const { data, error } = await getResorSupabase().from(TABLE).insert(result.payload).select(fields).single();
    if (error) throw error;
    return NextResponse.json({ activity: data }, { status: 201, headers: noCache });
  } catch (error) { console.error("Resor aktiviteter POST:", error); return fail("Kunde inte spara aktiviteten.", 500); }
}
export async function PUT(request: NextRequest) {
  const denied = authorize(request, true); if (denied) return denied;
  let body: unknown; try { body = await request.json(); } catch { return fail("Ogiltig JSON.", 400); }
  const result = parse(body); if ("error" in result) return fail(result.error ?? "Ogiltiga aktivitetsuppgifter.", 400);
  const id = (body as Record<string, unknown>).id;
  if (typeof id !== "string" || !uuid.test(id)) return fail("Ogiltigt aktivitets-ID.", 400);
  try {
    const { data, error } = await getResorSupabase().from(TABLE).update(result.payload).eq("id", id).eq("trip_id", result.payload.trip_id).select(fields).maybeSingle();
    if (error) throw error;
    if (!data) return fail("Aktiviteten hittades inte.", 404);
    return NextResponse.json({ activity: data }, { headers: noCache });
  } catch (error) { console.error("Resor aktiviteter PUT:", error); return fail("Kunde inte uppdatera aktiviteten.", 500); }
}
export async function DELETE(request: NextRequest) {
  const denied = authorize(request, true); if (denied) return denied;
  let body: unknown; try { body = await request.json(); } catch { return fail("Ogiltig JSON.", 400); }
  if (!body || typeof body !== "object") return fail("Ogiltiga uppgifter.", 400);
  const { id, trip_id } = body as Record<string, unknown>;
  if (typeof id !== "string" || !uuid.test(id) || typeof trip_id !== "string" || !uuid.test(trip_id)) return fail("Ogiltigt ID.", 400);
  try {
    const { data, error } = await getResorSupabase().from(TABLE).delete().eq("id", id).eq("trip_id", trip_id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return fail("Aktiviteten hittades inte.", 404);
    return NextResponse.json({ success: true }, { headers: noCache });
  } catch (error) { console.error("Resor aktiviteter DELETE:", error); return fail("Kunde inte ta bort aktiviteten.", 500); }
}
