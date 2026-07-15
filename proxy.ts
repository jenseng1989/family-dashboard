import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "family-dashboard-auth";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (publicPath) =>
      pathname === publicPath ||
      pathname.startsWith(`${publicPath}/`)
  );
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const sessionToken = process.env.DASHBOARD_SESSION_TOKEN;

  if (!sessionToken) {
    console.error(
      "Miljövariabeln DASHBOARD_SESSION_TOKEN saknas."
    );

    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  const cookieValue = request.cookies.get(
    COOKIE_NAME
  )?.value;

  if (cookieValue === sessionToken) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);

  const requestedPath =
    pathname + request.nextUrl.search;

  loginUrl.searchParams.set(
    "returnTo",
    requestedPath
  );

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};