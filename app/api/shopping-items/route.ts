import { hasDashboardSession } from "@/lib/dashboard-session";
import { NextRequest, NextResponse } from "next/server";
import { getResorSupabase } from "@/lib/supabase-resor-server";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "family-dashboard-auth";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function authorized(request: NextRequest): boolean {

  return hasDashboardSession(request);
}

function forbidden() {
  return NextResponse.json({ error: "Obehörig" }, { status: 401 });
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  if (!host) return false;
  try {
    const parsed = new URL(origin);
    return parsed.host === host && parsed.protocol === `${proto}:`;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return forbidden();
  try {
    const { data, error } = await getResorSupabase()
      .from("shopping_items")
      .select("id, name, created_at")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ items: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Shopping GET:", error);
    return NextResponse.json({ error: "Kunde inte hämta inköpslistan" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return forbidden();
  if (!sameOrigin(request)) return NextResponse.json({ error: "Ogiltigt ursprung" }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 }); }
  const name = typeof body === "object" && body !== null && "name" in body && typeof body.name === "string"
    ? body.name.trim() : "";
  if (name.length < 1 || name.length > 100) {
    return NextResponse.json({ error: "Varunamn måste vara 1–100 tecken" }, { status: 400 });
  }
  try {
    const { data, error } = await getResorSupabase()
      .from("shopping_items")
      .insert({ name })
      .select("id, name, created_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    console.error("Shopping POST:", error);
    return NextResponse.json({ error: "Kunde inte lägga till varan" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!authorized(request)) return forbidden();
  if (!sameOrigin(request)) return NextResponse.json({ error: "Ogiltigt ursprung" }, { status: 403 });
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!UUID.test(id)) return NextResponse.json({ error: "Ogiltigt id" }, { status: 400 });
  try {
    const { data, error } = await getResorSupabase()
      .from("shopping_items")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Varan finns inte" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Shopping DELETE:", error);
    return NextResponse.json({ error: "Kunde inte ta bort varan" }, { status: 500 });
  }
}
