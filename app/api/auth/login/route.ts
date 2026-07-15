import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "family-dashboard-auth";

function passwordsMatch(
  enteredPassword: string,
  correctPassword: string
): boolean {
  const enteredBuffer = Buffer.from(enteredPassword);
  const correctBuffer = Buffer.from(correctPassword);

  if (enteredBuffer.length !== correctBuffer.length) {
    return false;
  }

  return timingSafeEqual(enteredBuffer, correctBuffer);
}

function getSafeReturnPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/";
  }

  return value;
}

export async function POST(request: NextRequest) {
  const dashboardPassword = process.env.DASHBOARD_PASSWORD;
  const sessionToken = process.env.DASHBOARD_SESSION_TOKEN;

  if (!dashboardPassword || !sessionToken) {
    console.error(
      "DASHBOARD_PASSWORD eller DASHBOARD_SESSION_TOKEN saknas."
    );

    return NextResponse.json(
      {
        error: "Lösenordsskyddet är inte korrekt konfigurerat.",
      },
      {
        status: 500,
      }
    );
  }

  let body: {
    password?: unknown;
    returnTo?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Ogiltig förfrågan.",
      },
      {
        status: 400,
      }
    );
  }

  if (typeof body.password !== "string") {
    return NextResponse.json(
      {
        error: "Du måste skriva in ett lösenord.",
      },
      {
        status: 400,
      }
    );
  }

  if (!passwordsMatch(body.password, dashboardPassword)) {
    return NextResponse.json(
      {
        error: "Fel lösenord.",
      },
      {
        status: 401,
      }
    );
  }

  const response = NextResponse.json({
    success: true,
    returnTo: getSafeReturnPath(body.returnTo),
  });

  response.cookies.set({
    name: COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}