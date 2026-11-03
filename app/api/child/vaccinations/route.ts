import { hasDashboardSession } from "@/lib/dashboard-session";
import { NextRequest, NextResponse } from "next/server";
import { getResorSupabase } from "@/lib/supabase-resor-server";

export const dynamic = "force-dynamic";

const FIELDS = "id, member_id, vaccine_name, vaccination_date, dose, notes, created_at";

function authorized(request: NextRequest): boolean {

  return hasDashboardSession(request);
}

function validOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const expected = new URL(request.url);
    const received = new URL(origin);
    const forwardedHost = request.headers.get("x-forwarded-host");
    return received.protocol === "https:" && (received.host === expected.host || received.host === forwardedHost)
      || received.origin === expected.origin;
  } catch {
    return false;
  }
}

const bad = (error: string, status: number, code?: string) =>
  NextResponse.json({ error, ...(code ? { code } : {}) }, { status });

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return bad("Inte inloggad", 401);
  const memberId = request.nextUrl.searchParams.get("memberId");
  if (!memberId) return bad("Medlems-ID saknas", 400);
  try {
    const { data, error } = await getResorSupabase()
      .from("signe_vaccinations").select(FIELDS).eq("member_id", memberId)
      .order("vaccination_date", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ vaccinations: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Vaccinationshämtning misslyckades:", error);
    return bad("Kunde inte hämta vaccinationer", 500);
  }
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return bad("Inte inloggad", 401);
  if (!validOrigin(request)) return bad("Ogiltigt ursprung", 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return bad("JSON krävs", 415);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return bad("Ogiltig JSON", 400); }
  const { action, memberId, id } = body;
  if (typeof memberId !== "string" || !memberId) return bad("Medlems-ID saknas", 400);
  if (action !== "create" && action !== "update" && action !== "delete") return bad("Ogiltig åtgärd", 400);
  if ((action === "update" || action === "delete") && (typeof id !== "string" || !id)) return bad("Post-ID saknas", 400);
  try {
    const db = getResorSupabase();
    if (action === "delete") {
      const { data, error } = await db.from("signe_vaccinations").delete()
        .eq("id", id as string).eq("member_id", memberId).select("id");
      if (error) throw error;
      if (!data?.length) return bad("Vaccinationen hittades inte", 404);
      return NextResponse.json({ ok: true });
    }
    const name = body.vaccine_name;
    const date = body.vaccination_date;
    const dose = body.dose;
    const notes = body.notes;
    if (typeof name !== "string" || name.trim().length < 1 || name.trim().length > 100 || !validDate(date)) {
      return bad("Kontrollera vaccin och datum", 400);
    }
    if ((dose !== null && dose !== undefined && (typeof dose !== "string" || dose.length > 50)) ||
        (notes !== null && notes !== undefined && (typeof notes !== "string" || notes.length > 500))) {
      return bad("För lång dos eller anteckning", 400);
    }
    const values = {
      vaccine_name: name.trim(), vaccination_date: date,
      dose: typeof dose === "string" ? dose.trim() || null : null,
      notes: typeof notes === "string" ? notes.trim() || null : null,
    };
    const query = action === "create"
      ? db.from("signe_vaccinations").insert({ member_id: memberId, ...values })
      : db.from("signe_vaccinations").update(values).eq("id", id as string).eq("member_id", memberId);
    const { data, error } = await query.select(FIELDS).single();
    if (error) {
      if (error.code === "PGRST116") return bad("Vaccinationen hittades inte", 404);
      throw error;
    }
    return NextResponse.json({ vaccination: data });
  } catch (error) {
    console.error("Vaccinationsåtgärd misslyckades:", error);
    return bad("Kunde inte spara vaccinationsuppgifter", 500);
  }
}
