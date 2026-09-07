import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

type GoogleTokenResponse = {
  refresh_token?: string;
  error?: string;
  error_description?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function htmlResponse(
  title: string,
  body: string,
  status = 200
) {
  return new NextResponse(
    `<!doctype html>
<html lang="sv">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      margin: 0;
      background: #0f172a;
      color: #e2e8f0;
      font-family: Arial, sans-serif;
    }
    main {
      max-width: 760px;
      margin: 60px auto;
      padding: 32px;
      background: #111827;
      border: 1px solid #334155;
      border-radius: 18px;
    }
    h1 { color: #fff; }
    code {
      display: block;
      overflow-wrap: anywhere;
      padding: 16px;
      background: #020617;
      border-radius: 12px;
      color: #bfdbfe;
      margin: 18px 0;
    }
    p { line-height: 1.6; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    ${body}
  </main>
</body>
</html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return htmlResponse(
      "Google Calendar kunde inte anslutas",
      "<p>Nödvändiga miljövariabler saknas.</p>",
      500
    );
  }

  if (error) {
    return htmlResponse(
      "Google Calendar nekades",
      `<p>Google returnerade: <strong>${escapeHtml(error)}</strong></p>`,
      400
    );
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const stateMatch = cookieHeader.match(
    /(?:^|;\s*)google_calendar_oauth_state=([^;]+)/
  );
  const storedState = stateMatch
    ? decodeURIComponent(stateMatch[1])
    : null;

  if (
    !code ||
    !returnedState ||
    !storedState ||
    returnedState !== storedState
  ) {
    return htmlResponse(
      "Google Calendar kunde inte anslutas",
      "<p>OAuth-kontrollen misslyckades. Starta anslutningen igen från /api/google-calendar.</p>",
      400
    );
  }

  try {
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });

    const tokens = (await tokenResponse.json()) as GoogleTokenResponse;

    if (!tokenResponse.ok) {
      throw new Error(
        tokens.error_description ||
          tokens.error ||
          "Google kunde inte skapa OAuth-token."
      );
    }

    if (!tokens.refresh_token) {
      return htmlResponse(
        "Google Calendar är ansluten",
        `<p>Google returnerade ingen refresh token.</p>
         <p>Öppna <code>http://localhost:3000/api/google-calendar</code> igen och godkänn kalenderåtkomsten på nytt.</p>`,
        400
      );
    }

    const envLine =
      `GOOGLE_CALENDAR_REFRESH_TOKEN=${tokens.refresh_token}`;

    const response = htmlResponse(
      "Google Calendar är ansluten",
      `<p>OAuth-inloggningen fungerade.</p>
       <p>Kopiera raden nedan till din <strong>.env.local</strong>. Behandla värdet som en hemlighet och lägg det inte i Git.</p>
       <code>${escapeHtml(envLine)}</code>
       <p>Spara filen och starta sedan om utvecklingsservern.</p>`
    );

    response.cookies.set("google_calendar_oauth_state", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Google OAuth callback-fel:", error);

    return htmlResponse(
      "Google Calendar kunde inte anslutas",
      `<p>${escapeHtml(
        error instanceof Error ? error.message : "Okänt fel."
      )}</p>`,
      500
    );
  }
}
