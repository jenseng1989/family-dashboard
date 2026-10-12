import { NextRequest, NextResponse } from "next/server";
import { getResorSupabase } from "@/lib/supabase-resor-server";

export const dynamic = "force-dynamic";
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
function sumCosts(rows: {cost_sek: number | string | null}[] | null): number {
  return (rows ?? []).reduce((sum, row) => sum + (row.cost_sek == null ? 0 : Number(row.cost_sek)), 0);
}
export async function GET(request: NextRequest) {
  const denied = authorize(request); if (denied) return denied;
  const tripId = request.nextUrl.searchParams.get("tripId");
  if (!tripId || !uuid.test(tripId)) return fail("Ogiltigt rese-ID.", 400);
  try {
    const db = getResorSupabase();
    const [trip, budget, transports, accommodations, activities] = await Promise.all([
      db.from("resor_trips").select("id").eq("id", tripId).maybeSingle(),
      db.from("resor_budgets").select("target_sek").eq("trip_id", tripId).maybeSingle(),
      db.from("resor_transports").select("cost_sek").eq("trip_id", tripId),
      db.from("resor_accommodations").select("cost_sek").eq("trip_id", tripId),
      db.from("resor_activities").select("cost_sek").eq("trip_id", tripId),
    ]);
    for (const response of [trip, budget, transports, accommodations, activities]) if (response.error) throw response.error;
    if (!trip.data) return fail("Resan hittades inte.", 404);
    const totals = { transport: sumCosts(transports.data), accommodation: sumCosts(accommodations.data), activity: sumCosts(activities.data) };
    return NextResponse.json({ target_sek: budget.data?.target_sek == null ? null : Number(budget.data.target_sek), totals }, { headers });
  } catch (error) { console.error("Resor budget GET:", error); return fail("Kunde inte läsa budgeten. Kontrollera SQL-tabellen.", 500); }
}
export async function PUT(request: NextRequest) {
  const denied = authorize(request, true); if (denied) return denied;
  let body: unknown; try { body = await request.json(); } catch { return fail("Ogiltig JSON.", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return fail("Ogiltiga uppgifter.", 400);
  const { trip_id, target_sek } = body as Record<string, unknown>;
  if (typeof trip_id !== "string" || !uuid.test(trip_id)) return fail("Ogiltigt rese-ID.", 400);
  if (target_sek !== null && (typeof target_sek !== "number" || !Number.isFinite(target_sek) || target_sek < 0 || target_sek > 100000000 || Math.round(target_sek * 100) !== target_sek * 100)) return fail("Ogiltig budget.", 400);
  try {
    const db = getResorSupabase();
    const trip = await db.from("resor_trips").select("id").eq("id", trip_id).maybeSingle();
    if (trip.error) throw trip.error;
    if (!trip.data) return fail("Resan hittades inte.", 404);
    const { error } = await db.from("resor_budgets").upsert({ trip_id, target_sek }, { onConflict: "trip_id" });
    if (error) throw error;
    return NextResponse.json({ success: true, target_sek }, { headers });
  } catch (error) { console.error("Resor budget PUT:", error); return fail("Kunde inte spara budgeten.", 500); }
}
