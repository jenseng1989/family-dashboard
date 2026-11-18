import { verifyDashboardSession } from "@/lib/dashboard-session";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "family-dashboard-auth";
const PUBLIC_PATHS = ["/login", "/api/auth/login"];
const ANDROID_SYNC_PATH = "/api/health/steps";

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((publicPath) =>
    pathname === publicPath || pathname.startsWith(`${publicPath}/`)
  );
}

function unauthorized(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Du behöver logga in för att använda denna funktion." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("returnTo", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export function proxy(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname)) return NextResponse.next();
  // Endast POST får passera till API-ruttens separata Bearer-autentisering.
  if (request.nextUrl.pathname === ANDROID_SYNC_PATH && request.method === "POST") {
    return NextResponse.next();
  }
  const cookieValue = request.cookies.get(COOKIE_NAME)?.value;
  if (verifyDashboardSession(cookieValue)) return NextResponse.next();
  return unauthorized(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
