import { hasDashboardSession } from "@/lib/dashboard-session";
import { NextRequest, NextResponse } from "next/server";
import { getResorSupabase } from "@/lib/supabase-resor-server";

export const dynamic = "force-dynamic";

const COLUMNS = "id, member_id, tooth_code, tooth_name, eruption_date, created_at";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOOTH_CODE = /^[UL]-[RL]-(?:2M|1M|C|LI|CI)$/;

function authorized(request: NextRequest): boolean {

  return hasDashboardSession(request);
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const expectedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!expectedHost) return false;
  try {
    return new URL(origin).host === expectedHost;
  } catch {
    return false;
  }
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && value <= new Date().toISOString().slice(0, 10);
}

function errorResponse(message: string, status: number, code?: string) {
  return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status });
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return errorResponse("Inte inloggad.", 401);
  const memberId = request.nextUrl.searchParams.get("memberId");
  if (!memberId || !UUID.test(memberId)) return errorResponse("Ogiltigt familjemedlems-ID.", 400);
  const { data, error } = await getResorSupabase()
    .from("signe_teeth")
    .select(COLUMNS)
    .eq("member_id", memberId)
    .order("eruption_date", { ascending: true });
  if (error) {
    console.error("Kunde inte läsa tanddata:", error);
    return errorResponse("Kunde inte hämta tandinformationen.", 500);
  }
  return NextResponse.json({ data: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return errorResponse("Inte inloggad.", 401);
  if (!sameOrigin(request)) return errorResponse("Otillåtet ursprung.", 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return errorResponse("JSON krävs.", 415);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return errorResponse("Ogiltig JSON.", 400); }
  const { member_id, tooth_code, tooth_name, eruption_date } = body;
  if (typeof member_id !== "string" || !UUID.test(member_id) ||
      typeof tooth_code !== "string" || !TOOTH_CODE.test(tooth_code) ||
      typeof tooth_name !== "string" || tooth_name.trim().length < 1 || tooth_name.length > 100 ||
      !validDate(eruption_date)) {
    return errorResponse("Ogiltiga tanduppgifter.", 400);
  }
  const db = getResorSupabase();
  const { data: existing, error: existingError } = await db.from("signe_teeth")
    .select("id").eq("member_id", member_id).eq("tooth_code", tooth_code).limit(1);
  if (existingError) return errorResponse("Kunde inte kontrollera tanden.", 500);
  if (existing && existing.length > 0) return errorResponse("Den tanden är redan registrerad.", 409, "23505");
  const { data, error } = await db.from("signe_teeth")
    .insert({ member_id, tooth_code, tooth_name: tooth_name.trim(), eruption_date })
    .select(COLUMNS).single();
  if (error) {
    console.error("Kunde inte spara tand:", error);
    return errorResponse("Tanden kunde inte sparas.", error.code === "23505" ? 409 : 500, error.code);
  }
  return NextResponse.json({ data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  if (!authorized(request)) return errorResponse("Inte inloggad.", 401);
  if (!sameOrigin(request)) return errorResponse("Otillåtet ursprung.", 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return errorResponse("JSON krävs.", 415);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return errorResponse("Ogiltig JSON.", 400); }
  const { id, member_id } = body;
  if (typeof id !== "string" || !UUID.test(id) || typeof member_id !== "string" || !UUID.test(member_id)) {
    return errorResponse("Ogiltigt ID.", 400);
  }
  const { data, error } = await getResorSupabase().from("signe_teeth")
    .delete().eq("id", id).eq("member_id", member_id).select("id");
  if (error) {
    console.error("Kunde inte ta bort tand:", error);
    return errorResponse("Tanden kunde inte tas bort.", 500);
  }
  if (!data?.length) return errorResponse("Tanden hittades inte.", 404);
  return NextResponse.json({ ok: true });
}
