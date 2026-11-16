import { NextRequest, NextResponse } from "next/server";
import { verifyDashboardSession } from "@/lib/dashboard-session";
import { getFamilyTasksSupabase } from "@/lib/family-tasks-server";

export const dynamic = "force-dynamic";
const cookieName = "family-dashboard-auth";
type TaskInput = { id?: unknown; title?: unknown; done?: unknown };

function authorized(request: NextRequest) {
  return verifyDashboardSession(request.cookies.get(cookieName)?.value);
}
function reject() {
  return NextResponse.json({ error: "Du behöver logga in." }, { status: 401 });
}
function errorResponse(error: unknown) {
  console.error("family-tasks API:", error);
  return NextResponse.json({ error: "Kunde inte spara eller läsa uppgifterna." }, { status: 500 });
}
function validTitle(title: unknown): title is string {
  return typeof title === "string" && title.trim().length > 0 && title.trim().length <= 250;
}
function validId(id: unknown): id is string {
  return typeof id === "string" && /^[a-zA-Z0-9_.-]{1,100}$/.test(id);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return reject();
  try {
    const { data, error } = await getFamilyTasksSupabase()
      .from("family_tasks").select("id,title,done").order("created_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ tasks: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return reject();
  let body: TaskInput;
  try { body = await request.json() as TaskInput; } catch { return NextResponse.json({ error: "Ogiltig JSON." }, { status: 400 }); }
  if (!validTitle(body.title)) return NextResponse.json({ error: "Uppgiften måste vara 1–250 tecken." }, { status: 400 });
  try {
    const { data, error } = await getFamilyTasksSupabase().from("family_tasks")
      .insert({ title: body.title.trim(), done: false })
      .select("id,title,done").single();
    if (error) throw error;
    return NextResponse.json({ task: data }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: NextRequest) {
  if (!authorized(request)) return reject();
  let body: TaskInput;
  try { body = await request.json() as TaskInput; } catch { return NextResponse.json({ error: "Ogiltig JSON." }, { status: 400 }); }
  if (!validId(body.id) || typeof body.done !== "boolean") return NextResponse.json({ error: "Ogiltig uppgift." }, { status: 400 });
  try {
    const { data, error } = await getFamilyTasksSupabase().from("family_tasks")
      .update({ done: body.done }).eq("id", body.id).select("id,title,done").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Uppgiften finns inte." }, { status: 404 });
    return NextResponse.json({ task: data });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: NextRequest) {
  if (!authorized(request)) return reject();
  let body: TaskInput;
  try { body = await request.json() as TaskInput; } catch { return NextResponse.json({ error: "Ogiltig JSON." }, { status: 400 }); }
  if (!validId(body.id)) return NextResponse.json({ error: "Ogiltig uppgift." }, { status: 400 });
  try {
    const { error } = await getFamilyTasksSupabase().from("family_tasks").delete().eq("id", body.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) { return errorResponse(error); }
}

// Importerar gamla lokala uppgifter utan att skriva över uppgifter som redan finns.
export async function PUT(request: NextRequest) {
  if (!authorized(request)) return reject();
  let body: { tasks?: TaskInput[] };
  try { body = await request.json() as { tasks?: TaskInput[] }; } catch { return NextResponse.json({ error: "Ogiltig JSON." }, { status: 400 }); }
  if (!Array.isArray(body.tasks) || body.tasks.length > 200 || !body.tasks.every(t => validId(t.id) && validTitle(t.title) && typeof t.done === "boolean")) {
    return NextResponse.json({ error: "Ogiltiga importuppgifter." }, { status: 400 });
  }
  try {
    const rows = body.tasks.map(t => ({ id: `legacy_${t.id}`, title: (t.title as string).trim(), done: t.done as boolean }));
    if (rows.length) {
      const { error } = await getFamilyTasksSupabase().from("family_tasks").upsert(rows, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw error;
    }
    return NextResponse.json({ success: true });
  } catch (error) { return errorResponse(error); }
}
