import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "family-dashboard-auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (publicPath) =>
      pathname === publicPath || pathname.startsWith(`${publicPath}/`)
  );
}

function tokensMatch(received: string | undefined, expected: string): boolean {
  if (!received) return false;

  // Hasha båda värdena till samma längd innan konstanttidsjämförelsen.
  const receivedHash = createHash("sha256").update(received).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(receivedHash, expectedHash);
}

function unauthorized(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Du behöver logga in för att använda denna funktion." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "returnTo",
    request.nextUrl.pathname + request.nextUrl.search
  );
  return NextResponse.redirect(loginUrl);
}

export function proxy(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const sessionToken = process.env.DASHBOARD_SESSION_TOKEN;
  if (!sessionToken) {
    console.error("Miljövariabeln DASHBOARD_SESSION_TOKEN saknas.");
    return unauthorized(request);
  }

  const cookieValue = request.cookies.get(COOKIE_NAME)?.value;
  if (tokensMatch(cookieValue, sessionToken)) {
    return NextResponse.next();
  }

  return unauthorized(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
