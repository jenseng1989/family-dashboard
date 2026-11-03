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

type Update = { widgetId: string; isVisible?: boolean; sortOrder?: number; size?: "full" | "half" };
function validId(value: unknown): value is string { return typeof value === "string" && value.length > 0 && value.length <= 150; }
export async function GET(request: NextRequest) {
  if (!authorized(request)) return forbidden();
  try {
    const { data, error } = await getResorSupabase().from("widget_settings").select("widget_id, is_visible, sort_order, size").order("sort_order", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ settings: (data ?? []).map(row => ({ widgetId: row.widget_id, isVisible: row.is_visible, sortOrder: row.sort_order, size: row.size ?? "full" })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { console.error("Widget GET:", error); return NextResponse.json({ error: "Kunde inte hämta widgetinställningar" }, { status: 500 }); }
}
export async function PATCH(request: NextRequest) {
  if (!authorized(request)) return forbidden();
  if (!sameOrigin(request)) return NextResponse.json({ error: "Ogiltigt ursprung" }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 }); }
  if (typeof body !== "object" || body === null || !("updates" in body) || !Array.isArray(body.updates) || body.updates.length < 1 || body.updates.length > 200) return NextResponse.json({ error: "Ogiltiga uppdateringar" }, { status: 400 });
  const updates: Update[] = body.updates;
  for (const update of updates) {
    if (!update || !validId(update.widgetId) || (update.isVisible === undefined && update.sortOrder === undefined && update.size === undefined) || (update.isVisible !== undefined && typeof update.isVisible !== "boolean") || (update.sortOrder !== undefined && (!Number.isSafeInteger(update.sortOrder) || update.sortOrder < 0 || update.sortOrder > 100000)) || (update.size !== undefined && update.size !== "full" && update.size !== "half")) return NextResponse.json({ error: "Ogiltig widgetinställning" }, { status: 400 });
  }
  try {
    const db = getResorSupabase();
    for (const update of updates) {
      const changes: { is_visible?: boolean; sort_order?: number; size?: string; updated_at: string } = { updated_at: new Date().toISOString() };
      if (update.isVisible !== undefined) changes.is_visible = update.isVisible;
      if (update.sortOrder !== undefined) changes.sort_order = update.sortOrder;
      if (update.size !== undefined) changes.size = update.size;
      const { error } = await db.from("widget_settings").update(changes).eq("widget_id", update.widgetId);
      if (error) throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) { console.error("Widget PATCH:", error); return NextResponse.json({ error: "Kunde inte spara widgetinställningar" }, { status: 500 }); }
}
