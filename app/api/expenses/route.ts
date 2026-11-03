import { hasDashboardSession } from "@/lib/dashboard-session";
import { NextRequest, NextResponse } from "next/server";
import { getResorSupabase } from "@/lib/supabase-resor-server";

export const dynamic = "force-dynamic";
const GROUP_COLUMNS = "id, name, sort_order, created_at, group_type, is_archived, archived_at";
const EXPENSE_COLUMNS = "id, item, price, created_at, group_id, paid_by, category";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const categories = ["Mat", "Boende", "Transport", "Aktivitet", "Shopping", "Övrigt"];
const payers = ["Jens", "Lenita", "Gemensam"];

function authorized(request: NextRequest) {

  return hasDashboardSession(request);
}
function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).origin === request.nextUrl.origin; } catch { return false; }
}
function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
function validText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}
function validPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 999999999 && Math.abs(Math.round(value * 100) - value * 100) < 0.000001;
}
async function getGroup(id: string) {
  const { data, error } = await getResorSupabase().from("expense_groups").select("id, group_type, is_archived").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}
export async function GET(request: NextRequest) {
  if (!authorized(request)) return json({ error: "Obehörig" }, 401);
  try {
    const db = getResorSupabase();
    const [groups, expenses] = await Promise.all([
      db.from("expense_groups").select(GROUP_COLUMNS).order("sort_order").order("created_at"),
      db.from("shopping_ledger").select(EXPENSE_COLUMNS).order("created_at", { ascending: false }),
    ]);
    if (groups.error || expenses.error) throw groups.error ?? expenses.error;
    return json({ groups: groups.data ?? [], expenses: expenses.data ?? [] });
  } catch (error) { console.error("Expenses GET", error); return json({ error: "Kunde inte hämta utgifter" }, 500); }
}
export async function POST(request: NextRequest) {
  if (!authorized(request)) return json({ error: "Obehörig" }, 401);
  if (!sameOrigin(request)) return json({ error: "Ogiltigt ursprung" }, 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "JSON krävs" }, 415);
  try {
    const body = await request.json();
    const db = getResorSupabase();
    if (body.action === "addGroup") {
      if (!validText(body.name, 60) || !["simple", "advanced"].includes(body.group_type) || !Number.isInteger(body.sort_order) || body.sort_order < 0 || body.sort_order > 100000000) return json({ error: "Ogiltig grupp" }, 400);
      const { data, error } = await db.from("expense_groups").insert({ name: body.name.trim(), group_type: body.group_type, sort_order: body.sort_order, is_archived: false }).select(GROUP_COLUMNS).single();
      if (error) throw error;
      return json({ data }, 201);
    }
    if (body.action === "addExpense") {
      if (!UUID.test(body.group_id ?? "") || !validText(body.item, 100) || !validPrice(body.price) || !payers.includes(body.paid_by)) return json({ error: "Ogiltig utgift" }, 400);
      const group = await getGroup(body.group_id);
      if (!group || group.is_archived) return json({ error: "Gruppen saknas eller är arkiverad" }, 400);
      const category = group.group_type === "advanced" ? body.category : null;
      if (category !== null && !categories.includes(category)) return json({ error: "Ogiltig kategori" }, 400);
      const { data, error } = await db.from("shopping_ledger").insert({ item: body.item.trim(), price: body.price, group_id: body.group_id, paid_by: body.paid_by, category }).select(EXPENSE_COLUMNS).single();
      if (error) throw error;
      return json({ data }, 201);
    }
    return json({ error: "Okänd åtgärd" }, 400);
  } catch (error) { console.error("Expenses POST", error); return json({ error: "Kunde inte spara" }, 500); }
}
export async function PATCH(request: NextRequest) {
  if (!authorized(request)) return json({ error: "Obehörig" }, 401);
  if (!sameOrigin(request)) return json({ error: "Ogiltigt ursprung" }, 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "JSON krävs" }, 415);
  try {
    const body = await request.json();
    if (!UUID.test(body.id ?? "")) return json({ error: "Ogiltigt ID" }, 400);
    const db = getResorSupabase();
    if (body.action === "editExpense") {
      if (!validText(body.item, 100) || !validPrice(body.price) || !payers.includes(body.paid_by)) return json({ error: "Ogiltig utgift" }, 400);
      const { data: existing, error: lookupError } = await db.from("shopping_ledger").select("group_id").eq("id", body.id).maybeSingle();
      if (lookupError) throw lookupError;
      if (!existing) return json({ error: "Utgiften saknas" }, 404);
      const group = await getGroup(existing.group_id);
      if (!group || group.is_archived) return json({ error: "Gruppen saknas eller är arkiverad" }, 400);
      const category = group.group_type === "advanced" ? body.category : null;
      if (category !== null && !categories.includes(category)) return json({ error: "Ogiltig kategori" }, 400);
      const { data, error } = await db.from("shopping_ledger").update({ item: body.item.trim(), price: body.price, paid_by: body.paid_by, category }).eq("id", body.id).select(EXPENSE_COLUMNS).single();
      if (error) throw error;
      return json({ data });
    }
    if (body.action === "renameGroup") {
      if (!validText(body.name, 60)) return json({ error: "Ogiltigt namn" }, 400);
      const { error } = await db.from("expense_groups").update({ name: body.name.trim() }).eq("id", body.id);
      if (error) throw error;
      return json({ ok: true });
    }
    if (body.action === "archiveGroup" || body.action === "restoreGroup") {
      const archived = body.action === "archiveGroup";
      const archivedAt = archived ? new Date().toISOString() : null;
      const { error } = await db.from("expense_groups").update({ is_archived: archived, archived_at: archivedAt }).eq("id", body.id);
      if (error) throw error;
      return json({ archived_at: archivedAt });
    }
    if (body.action === "upgradeGroup") {
      const group = await getGroup(body.id);
      if (!group) return json({ error: "Gruppen saknas" }, 404);
      if (group.is_archived) return json({ error: "Gruppen är arkiverad" }, 400);
      if (group.group_type === "advanced") return json({ ok: true });
      const { error: e1 } = await db.from("shopping_ledger").update({ category: "Övrigt" }).eq("group_id", body.id).is("category", null);
      if (e1) throw e1;
      const { error: e2 } = await db.from("expense_groups").update({ group_type: "advanced" }).eq("id", body.id);
      if (e2) throw e2;
      return json({ ok: true });
    }
    return json({ error: "Okänd åtgärd" }, 400);
  } catch (error) { console.error("Expenses PATCH", error); return json({ error: "Kunde inte uppdatera" }, 500); }
}
export async function DELETE(request: NextRequest) {
  if (!authorized(request)) return json({ error: "Obehörig" }, 401);
  if (!sameOrigin(request)) return json({ error: "Ogiltigt ursprung" }, 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "JSON krävs" }, 415);
  try {
    const body = await request.json();
    if (!UUID.test(body.id ?? "")) return json({ error: "Ogiltigt ID" }, 400);
    const db = getResorSupabase();
    if (body.action === "deleteExpense") {
      const { error } = await db.from("shopping_ledger").delete().eq("id", body.id);
      if (error) throw error;
      return json({ ok: true });
    }
    if (body.action === "deleteGroup") {
      // Remove child expenses explicitly; do not depend on foreign-key cascade settings.
      const { error: e1 } = await db.from("shopping_ledger").delete().eq("group_id", body.id);
      if (e1) throw e1;
      const { error: e2 } = await db.from("expense_groups").delete().eq("id", body.id);
      if (e2) throw e2;
      return json({ ok: true });
    }
    return json({ error: "Okänd åtgärd" }, 400);
  } catch (error) { console.error("Expenses DELETE", error); return json({ error: "Kunde inte radera" }, 500); }
}
