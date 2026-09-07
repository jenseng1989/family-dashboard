import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleCalendarEvent = {
  id?: string;
  summary?: string;
  location?: string;
  htmlLink?: string;
  start?: {
    date?: string;
    dateTime?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
  };
};

type GoogleCalendarResponse = {
  items?: GoogleCalendarEvent[];
  error?: {
    message?: string;
  };
};

function getRequiredEnvironment() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!clientId || !clientSecret || !redirectUri || !calendarId) {
    throw new Error(
      "Google Calendar saknar GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET, GOOGLE_CALENDAR_REDIRECT_URI eller GOOGLE_CALENDAR_ID."
    );
  }

  return { clientId, clientSecret, redirectUri, calendarId };
}

function buildGoogleAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string
) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_CALENDAR_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

async function getAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  const data = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description ||
        data.error ||
        "Google kunde inte skapa en access token."
    );
  }

  return data.access_token;
}

async function fetchUpcomingEvents(
  accessToken: string,
  calendarId: string
) {
  const params = new URLSearchParams({
    timeMin: new Date().toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "10",
  });

  const encodedCalendarId = encodeURIComponent(calendarId);

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  const data = (await response.json()) as GoogleCalendarResponse;

  if (!response.ok) {
    throw new Error(
      data.error?.message || "Google Calendar kunde inte hämtas."
    );
  }

  return (data.items ?? []).map((event) => ({
    id: event.id ?? crypto.randomUUID(),
    title: event.summary ?? "(Utan titel)",
    startTime: event.start?.dateTime ?? event.start?.date ?? null,
    endTime: event.end?.dateTime ?? event.end?.date ?? null,
    location: event.location ?? null,
    allDay: Boolean(event.start?.date && !event.start?.dateTime),
    htmlLink: event.htmlLink ?? null,
  }));
}

export async function GET() {
  try {
    const { clientId, clientSecret, redirectUri, calendarId } =
      getRequiredEnvironment();

    const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;

    if (!refreshToken) {
      const state = crypto.randomUUID();
      const authUrl = buildGoogleAuthUrl(
        clientId,
        redirectUri,
        state
      );

      const response = NextResponse.redirect(authUrl);

      response.cookies.set("google_calendar_oauth_state", state, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 10 * 60,
      });

      return response;
    }

    const accessToken = await getAccessToken(
      clientId,
      clientSecret,
      refreshToken
    );

    const events = await fetchUpcomingEvents(accessToken, calendarId);

    return Response.json({
      connected: true,
      calendarId,
      events,
    });
  } catch (error) {
    console.error("Google Calendar-fel:", error);

    return Response.json(
      {
        connected: false,
        events: [],
        error:
          error instanceof Error
            ? error.message
            : "Okänt Google Calendar-fel.",
      },
      { status: 500 }
    );
  }
}
