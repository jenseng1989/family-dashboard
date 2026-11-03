import { hasDashboardSession } from "@/lib/dashboard-session";
import { NextRequest, NextResponse } from "next/server";
import { getResorSupabase } from "@/lib/supabase-resor-server";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "family-dashboard-auth";
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {

  if (!hasDashboardSession(request)) {
    return NextResponse.json(
      { error: "Du måste vara inloggad." },
      { status: 401, headers: NO_STORE }
    );
  }

  try {
    const supabase = getResorSupabase();
    const [membersResult, nameDaysResult] = await Promise.all([
      supabase
        .from("family_members")
        .select("id,display_name,emoji,birthday,accent,member_type,sort_order,is_active,created_at,updated_at")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("family_name_days")
        .select("id,member_id,name,month,day,created_at")
        .order("month", { ascending: true })
        .order("day", { ascending: true }),
    ]);

    if (membersResult.error || nameDaysResult.error) {
      console.error("Family API database error:", membersResult.error ?? nameDaysResult.error);
      return NextResponse.json(
        { error: "Kunde inte läsa familjeuppgifterna." },
        { status: 500, headers: NO_STORE }
      );
    }

    return NextResponse.json(
      { members: membersResult.data ?? [], nameDays: nameDaysResult.data ?? [] },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("Family API server error:", error);
    return NextResponse.json(
      { error: "Servern kunde inte hämta familjeuppgifterna." },
      { status: 500, headers: NO_STORE }
    );
  }
}

// Skrivningar kräver både giltig sessionscookie och samma ursprung (CSRF-skydd).
const ACCENTS = new Set(["blue", "rose", "amber", "green", "purple", "cyan", "orange", "red", "indigo", "lime"]);
const uuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const validDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v + "T12:00:00Z").toISOString().slice(0,10) === v;
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status, headers: NO_STORE });

type RecordData = Record<string, unknown>;
function isObject(value: unknown): value is RecordData {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function parseMember(v: unknown): { data: RecordData; names: { name: string; month: number; day: number }[] } | null {
  if (!isObject(v)) return null;
  const displayName = typeof v.displayName === "string" ? v.displayName.trim() : "";
  const emoji = typeof v.emoji === "string" ? v.emoji.trim() : "";
  if (!displayName || displayName.length > 100 || emoji.length > 30 || !validDate(v.birthday) ||
      !ACCENTS.has(String(v.accent)) || (v.memberType !== "adult" && v.memberType !== "child")) return null;
  const names: { name: string; month: number; day: number }[] = [];
  if (v.names !== undefined) {
    if (!Array.isArray(v.names) || v.names.length > 20) return null;
    for (const item of v.names) {
      if (!isObject(item) || typeof item.name !== "string") return null;
      const name = item.name.trim();
      if (!name || name.length > 100) continue;
      if (!isObject(item.nameDay)) continue;
      const { month, day } = item.nameDay;
      if (!Number.isInteger(month) || !Number.isInteger(day) || Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31) return null;
      names.push({ name, month: Number(month), day: Number(day) });
    }
  }
  return { data: { display_name: displayName, emoji: emoji || (v.memberType === "child" ? "👶" : "👤"), birthday: v.birthday,
    accent: v.accent, member_type: v.memberType }, names };
}

export async function POST(request: NextRequest) {

  if (!hasDashboardSession(request)) return fail("Du måste vara inloggad.", 401);
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) return fail("Otillåtet ursprung.", 403);
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return fail("JSON krävs.", 415);
  let body: unknown;
  try { body = await request.json(); } catch { return fail("Ogiltig JSON."); }
  if (!isObject(body)) return fail("Ogiltiga uppgifter.");
  try {
    const db = getResorSupabase();
    if (body.action === "create") {
      const parsed = parseMember(body.input);
      if (!parsed) return fail("Ogiltiga personuppgifter.");
      const { data: latest, error: readError } = await db.from("family_members").select("sort_order").order("sort_order", { ascending: false }).limit(1);
      if (readError) throw readError;
      const { data, error } = await db.from("family_members").insert({ ...parsed.data, sort_order: (latest?.[0]?.sort_order ?? 0) + 10, is_active: true }).select("id").single();
      if (error) throw error;
      return NextResponse.json({ id: data.id }, { headers: NO_STORE });
    }
    if (body.action === "update") {
      const v = body.member;
      if (!isObject(v) || !uuid(v.id) || typeof v.isActive !== "boolean" || !Number.isSafeInteger(v.sortOrder)) return fail("Ogiltig familjemedlem.");
      const parsed = parseMember(v);
      if (!parsed) return fail("Ogiltiga personuppgifter.");
      const { data: existing, error: existingError } = await db.from("family_members").select("id").eq("id", v.id).maybeSingle();
      if (existingError) throw existingError;
      if (!existing) return fail("Familjemedlemmen finns inte.", 404);
      const { error: updateError } = await db.from("family_members").update({ ...parsed.data, sort_order: v.sortOrder, is_active: v.isActive, updated_at: new Date().toISOString() }).eq("id", v.id);
      if (updateError) throw updateError;
      const { error: deleteError } = await db.from("family_name_days").delete().eq("member_id", v.id);
      if (deleteError) throw deleteError;
      if (parsed.names.length) {
        const { error: insertError } = await db.from("family_name_days").insert(parsed.names.map(n => ({ member_id: v.id, ...n })));
        if (insertError) throw insertError;
      }
      return NextResponse.json({ success: true }, { headers: NO_STORE });
    }
    if (body.action === "setActive") {
      if (!uuid(body.memberId) || typeof body.isActive !== "boolean") return fail("Ogiltiga uppgifter.");
      const { data, error } = await db.from("family_members").update({ is_active: body.isActive, updated_at: new Date().toISOString() }).eq("id", body.memberId).select("id");
      if (error) throw error;
      if (!data?.length) return fail("Familjemedlemmen finns inte.", 404);
      return NextResponse.json({ success: true }, { headers: NO_STORE });
    }
    if (body.action === "delete") {
      if (!uuid(body.memberId)) return fail("Ogiltigt ID.");
      const { data, error } = await db.from("family_members").delete().eq("id", body.memberId).eq("is_active", false).select("id");
      if (error) throw error;
      if (!data?.length) return fail("Endast arkiverade personer får raderas permanent.", 400);
      return NextResponse.json({ success: true }, { headers: NO_STORE });
    }
    if (body.action === "move") {
      if (!uuid(body.memberId) || !uuid(body.targetId) || body.memberId === body.targetId) return fail("Ogiltiga ID:n.");
      const { data, error } = await db.from("family_members").select("id,sort_order").in("id", [body.memberId, body.targetId]);
      if (error) throw error;
      const a = data?.find(x => x.id === body.memberId), b = data?.find(x => x.id === body.targetId);
      if (!a || !b) return fail("Familjemedlemmen finns inte.", 404);
      const now = new Date().toISOString();
      const first = await db.from("family_members").update({ sort_order: b.sort_order, updated_at: now }).eq("id", a.id);
      if (first.error) throw first.error;
      const second = await db.from("family_members").update({ sort_order: a.sort_order, updated_at: now }).eq("id", b.id);
      if (second.error) {
        await db.from("family_members").update({ sort_order: a.sort_order, updated_at: now }).eq("id", a.id);
        throw second.error;
      }
      return NextResponse.json({ success: true }, { headers: NO_STORE });
    }
    return fail("Okänd åtgärd.");
  } catch (error) {
    console.error("Family API write error:", error);
    return fail("Kunde inte spara familjeuppgifterna.", 500);
  }
}
