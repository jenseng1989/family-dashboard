import { hasDashboardSession } from "@/lib/dashboard-session";
import { NextRequest, NextResponse } from "next/server";
import { getResorSupabase } from "@/lib/supabase-resor-server";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {

  return hasDashboardSession(request);
}
const denied = () => NextResponse.json({ error: "Obehörig." }, { status: 401 });

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  if (!host) return false;
  try {
    const url = new URL(origin);
    return url.host === host && url.protocol === `${proto}:`;
  } catch {
    return false;
  }
}
const wrongOrigin = () => NextResponse.json({ error: "Otillåtet ursprung." }, { status: 403 });


const columns = "id, plan_date, day_name, location, travel, accommodation, activity, information";
const fields = ["location", "travel", "accommodation", "activity", "information"] as const;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !datePattern.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
function readFields(body: Record<string, unknown>) {
  const values: Record<string, string | null> = {};
  for (const field of fields) {
    const value = body[field];
    if (value !== null && value !== undefined && typeof value !== "string") return null;
    if (typeof value === "string" && value.length > 2000) return null;
    values[field] = typeof value === "string" ? value.trim() || null : null;
  }
  return Object.values(values).some(Boolean) ? values : null;
}
export async function GET(request: NextRequest) {
  if (!authorized(request)) return denied();
  const { data, error } = await getResorSupabase().from("vacation_plan").select(columns).order("plan_date");
  if (error) return NextResponse.json({ error: "Kunde inte hämta dagsplaneringen." }, { status: 500 });
  return NextResponse.json({ days: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: NextRequest) {
  if (!authorized(request)) return denied();
  if (!sameOrigin(request)) return wrongOrigin();
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Ogiltig JSON." }, { status: 400 }); }
  const values = readFields(body);
  if (!validDate(body.plan_date) || typeof body.day_name !== "string" || body.day_name.length > 30 || !values) {
    return NextResponse.json({ error: "Ogiltiga uppgifter." }, { status: 400 });
  }
  const { data, error } = await getResorSupabase().from("vacation_plan")
    .insert({ plan_date: body.plan_date, day_name: body.day_name, ...values }).select(columns).single();
  if (error) return NextResponse.json({ error: "Kunde inte spara dagen." }, { status: error.code === "23505" ? 409 : 500 });
  return NextResponse.json({ day: data }, { status: 201 });
}
export async function PATCH(request: NextRequest) {
  if (!authorized(request)) return denied();
  if (!sameOrigin(request)) return wrongOrigin();
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Ogiltig JSON." }, { status: 400 }); }
  const values = readFields(body);
  if (typeof body.id !== "string" || !uuidPattern.test(body.id) || !values) {
    return NextResponse.json({ error: "Ogiltiga uppgifter." }, { status: 400 });
  }
  const { data, error } = await getResorSupabase().from("vacation_plan")
    .update(values).eq("id", body.id).select(columns).single();
  if (error) return NextResponse.json({ error: "Kunde inte uppdatera dagen." }, { status: 500 });
  return NextResponse.json({ day: data });
}
