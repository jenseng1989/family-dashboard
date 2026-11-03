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


const tabs = new Set(["today", "home", "weather", "family", "gothenburg", "fun", "resor", "hemmet3d"]);
export async function GET(request: NextRequest) {
  if (!authorized(request)) return denied();
  const raw = Number(request.nextUrl.searchParams.get("days") ?? 30);
  if (!Number.isInteger(raw) || raw < 1 || raw > 365) {
    return NextResponse.json({ error: "Ogiltigt antal dagar." }, { status: 400 });
  }
  const from = new Date();
  from.setDate(from.getDate() - raw);
  const { data, error } = await getResorSupabase().from("dashboard_analytics")
    .select("id, event_type, tab_id, created_at").gte("created_at", from.toISOString()).order("created_at");
  if (error) return NextResponse.json({ error: "Kunde inte hämta statistik." }, { status: 500 });
  return NextResponse.json({
    events: (data ?? []).map(row => ({
      id: row.id, eventType: row.event_type, tabId: row.tab_id, createdAt: row.created_at,
    })),
  }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: NextRequest) {
  if (!authorized(request)) return denied();
  if (!sameOrigin(request)) return wrongOrigin();
  let body: { eventType?: unknown; tabId?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Ogiltig JSON." }, { status: 400 }); }
  if ((body.eventType !== "dashboard_view" && body.eventType !== "tab_view") ||
      (body.tabId !== null && body.tabId !== undefined && (typeof body.tabId !== "string" || !tabs.has(body.tabId)))) {
    return NextResponse.json({ error: "Ogiltig händelse." }, { status: 400 });
  }
  const { error } = await getResorSupabase().from("dashboard_analytics")
    .insert({ event_type: body.eventType, tab_id: body.tabId ?? null });
  if (error) return NextResponse.json({ error: "Kunde inte spara statistik." }, { status: 500 });
  return NextResponse.json({ success: true });
}
