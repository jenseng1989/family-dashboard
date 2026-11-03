import { hasDashboardSession } from "@/lib/dashboard-session";
import { NextRequest, NextResponse } from "next/server";
import { getResorSupabase } from "@/lib/supabase-resor-server";

export const dynamic = "force-dynamic";

const columns = "id, member_id, measurement_date, weight_kg, height_cm, created_at";

function authorized(request: NextRequest): boolean {

  return hasDashboardSession(request);
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

function jsonRequest(request: NextRequest): boolean {
  return request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() === "application/json";
}

function validId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 128;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });
  const memberId = request.nextUrl.searchParams.get("memberId");
  if (!validId(memberId)) return NextResponse.json({ error: "Ogiltig familjemedlem." }, { status: 400 });
  const { data, error } = await getResorSupabase()
    .from("signe_growth")
    .select(columns)
    .eq("member_id", memberId)
    .order("measurement_date", { ascending: true });
  if (error) return NextResponse.json({ error: "Kunde inte hämta mätningar." }, { status: 500 });
  return NextResponse.json(data ?? [], { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });
  if (!sameOrigin(request) || !jsonRequest(request)) return NextResponse.json({ error: "Otillåten begäran." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const memberId = body?.member_id;
  const date = body?.measurement_date;
  const weight = body?.weight_kg;
  const height = body?.height_cm;
  if (!validId(memberId) || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) ||
      typeof weight !== "number" || weight < 1 || weight > 150 ||
      typeof height !== "number" || height < 30 || height > 220) {
    return NextResponse.json({ error: "Ogiltiga mätvärden." }, { status: 400 });
  }
  const { data, error } = await getResorSupabase().from("signe_growth")
    .insert({ member_id: memberId, measurement_date: date, weight_kg: weight, height_cm: height })
    .select(columns).single();
  if (error?.code === "23505") return NextResponse.json({ error: "Mätning finns redan för datumet." }, { status: 409 });
  if (error || !data) return NextResponse.json({ error: "Kunde inte spara mätningen." }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });
  if (!sameOrigin(request) || !jsonRequest(request)) return NextResponse.json({ error: "Otillåten begäran." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!validId(body?.id) || !validId(body?.member_id)) return NextResponse.json({ error: "Ogiltig mätning." }, { status: 400 });
  const { error } = await getResorSupabase().from("signe_growth")
    .delete().eq("id", body.id).eq("member_id", body.member_id);
  if (error) return NextResponse.json({ error: "Kunde inte ta bort mätningen." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
