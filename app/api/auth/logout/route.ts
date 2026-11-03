import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "family-dashboard-auth";

function hasSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Otillåtet ursprung." }, {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const response = NextResponse.json({
    success: true,
  }, { headers: { "Cache-Control": "no-store" } });

  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}