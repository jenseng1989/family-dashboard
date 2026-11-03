import { hasDashboardSession } from "@/lib/dashboard-session";
import { NextRequest, NextResponse } from "next/server";
import { getResorSupabase } from "@/lib/supabase-resor-server";

export const dynamic = "force-dynamic";

const TODO_COLUMNS = "id, member_id, task, created_at";
const NOTE_COLUMNS = "id, member_id, title, content, created_at, updated_at";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function authorized(request: NextRequest): boolean {
  return hasDashboardSession(request);
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function safeWrite(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return false;
  return request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() === "application/json";
}

function validMember(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function validId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function validText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length >= 1 && value.trim().length <= max;
}

async function validAdultMember(memberId: string): Promise<boolean> {
  const { data, error } = await getResorSupabase()
    .from("family_members")
    .select("id")
    .eq("id", memberId)
    .eq("is_active", true)
    .eq("member_type", "adult")
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return jsonError("Obehörig.", 401);
  const memberId = request.nextUrl.searchParams.get("memberId");
  if (!validMember(memberId)) return jsonError("Ogiltig familjemedlem.", 400);
  try {
    if (!(await validAdultMember(memberId))) return jsonError("Familjemedlemmen saknas.", 404);
    const db = getResorSupabase();
    const [todos, notes] = await Promise.all([
      db.from("personal_todos").select(TODO_COLUMNS).eq("member_id", memberId).order("created_at", { ascending: true }),
      db.from("personal_notes").select(NOTE_COLUMNS).eq("member_id", memberId).order("updated_at", { ascending: false }),
    ]);
    if (todos.error || notes.error) throw todos.error ?? notes.error;
    return NextResponse.json({ todos: todos.data ?? [], notes: notes.data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Personal center GET failed:", error);
    return jsonError("Kunde inte hämta personligt innehåll.", 500);
  }
}

async function write(request: NextRequest, method: "POST" | "PATCH" | "DELETE") {
  if (!authorized(request)) return jsonError("Obehörig.", 401);
  if (!safeWrite(request)) return jsonError("Ogiltigt ursprung eller innehållstyp.", 403);
  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return jsonError("Ogiltig JSON.", 400); }
  if (!body || !validMember(body.memberId)) return jsonError("Ogiltig familjemedlem.", 400);
  const memberId = body.memberId;
  if (body.kind !== "note" && body.kind !== "todo") return jsonError("Ogiltig typ.", 400);
  if (body.kind === "todo" && method === "PATCH") return jsonError("Åtgärden stöds inte.", 400);
  if (method !== "POST" && !validId(body.id)) return jsonError("Ogiltigt ID.", 400);
  if (method === "POST" || method === "PATCH") {
    if (body.kind === "note" && (!validText(body.title, 100) || !validText(body.content, 3000)))
      return jsonError("Rubrik eller innehåll är ogiltigt.", 400);
    if (body.kind === "todo" && !validText(body.task, 200))
      return jsonError("Uppgiften är ogiltig.", 400);
  }
  try {
    if (!(await validAdultMember(memberId))) return jsonError("Familjemedlemmen saknas.", 404);
    const db = getResorSupabase();
    if (method === "POST") {
      if (body.kind === "note") {
        const { data, error } = await db.from("personal_notes")
          .insert({
            member_id: memberId,
            title: (body.title as string).trim(),
            content: (body.content as string).trim(),
          })
          .select(NOTE_COLUMNS).single();
        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
      }
      const { data, error } = await db.from("personal_todos")
        .insert({ member_id: memberId, task: (body.task as string).trim() })
        .select(TODO_COLUMNS).single();
      if (error) throw error;
      return NextResponse.json(data, { status: 201 });
    }
    if (method === "PATCH") {
      const { data, error } = await db.from("personal_notes")
        .update({ title: (body.title as string).trim(), content: (body.content as string).trim(), updated_at: new Date().toISOString() })
        .eq("id", body.id as string).eq("member_id", memberId).select(NOTE_COLUMNS).maybeSingle();
      if (error) throw error;
      if (!data) return jsonError("Anteckningen hittades inte.", 404);
      return NextResponse.json(data);
    }
    if (body.kind === "note") {
      const { data, error } = await db.from("personal_notes").delete()
        .eq("id", body.id as string).eq("member_id", memberId).select("id").maybeSingle();
      if (error) throw error;
      if (!data) return jsonError("Posten hittades inte.", 404);
      return NextResponse.json({ success: true });
    }
    const { data, error } = await db.from("personal_todos").delete()
      .eq("id", body.id as string).eq("member_id", memberId).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return jsonError("Posten hittades inte.", 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Personal center ${method} failed:`, error);
    return jsonError("Databasåtgärden misslyckades.", 500);
  }
}

export async function POST(request: NextRequest) { return write(request, "POST"); }
export async function PATCH(request: NextRequest) { return write(request, "PATCH"); }
export async function DELETE(request: NextRequest) { return write(request, "DELETE"); }
