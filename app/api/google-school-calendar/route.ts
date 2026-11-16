export const dynamic = "force-dynamic";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const TOKEN_MARGIN_MS = 5 * 60 * 1000;

type Token = { accessToken: string; expiresAt: number };
let cachedToken: Token | null = null;
let pendingTokenRequest: Promise<string> | null = null;

type GoogleEvent = {
  id?: string; summary?: string; location?: string; htmlLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};
type GoogleResult = {
  items?: GoogleEvent[]; nextPageToken?: string;
  error?: { message?: string };
};

function getEnvironment() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_BASE64;
  const legacy = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const privateKey = encoded
    ? Buffer.from(encoded, "base64").toString("utf8")
    : legacy?.replace(/\\n/g, "\n");
  const calendarId = process.env.GOOGLE_SCHOOL_CALENDAR_ID;
  if (!email || !privateKey || !calendarId) {
    throw new Error("Google Calendar saknar nödvändiga miljövariabler.");
  }
  return { email, privateKey, calendarId };
}

function base64Url(value: string | Uint8Array) {
  return Buffer.from(value).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function requestAccessToken(email: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const pem = privateKey.replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "").replace(/\s/g, "");
  const key = await crypto.subtle.importKey("pkcs8", Buffer.from(pem, "base64"),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, Buffer.from(unsigned));
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;
  const response = await fetch(TOKEN_URL, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion,
    }), cache: "no-store",
  });
  const data = await response.json() as {
    access_token?: string; expires_in?: number; error?: string; error_description?: string;
  };
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Kunde inte autentisera Google Calendar.");
  }
  const lifetime = typeof data.expires_in === "number" && data.expires_in > 0
    ? data.expires_in : 3600;
  cachedToken = { accessToken: data.access_token, expiresAt: Date.now() + lifetime * 1000 };
  return data.access_token;
}

async function getAccessToken(email: string, privateKey: string) {
  if (cachedToken && Date.now() < cachedToken.expiresAt - TOKEN_MARGIN_MS) {
    return cachedToken.accessToken;
  }
  if (pendingTokenRequest) return pendingTokenRequest;
  const request = requestAccessToken(email, privateKey);
  pendingTokenRequest = request;
  try { return await request; }
  finally { if (pendingTokenRequest === request) pendingTokenRequest = null; }
}

function parseMonth(request: Request) {
  const month = new URL(request.url).searchParams.get("month");
  if (month === null) return null;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new RangeError("month måste anges som ÅÅÅÅ-MM.");
  }
  const [year, monthNumber] = month.split("-").map(Number);
  if (year < 1970 || year > 2100) throw new RangeError("Månad utanför tillåtet intervall.");
  return {
    timeMin: new Date(Date.UTC(year, monthNumber - 1, 1)).toISOString(),
    timeMax: new Date(Date.UTC(year, monthNumber, 1)).toISOString(),
  };
}

async function fetchEvents(accessToken: string, calendarId: string, range: ReturnType<typeof parseMonth>) {
  const params = new URLSearchParams({
    ...(range ?? { timeMin: new Date(Date.now() - 86400000).toISOString(),
      timeMax: new Date(Date.now() + 8 * 86400000).toISOString(),
      maxResults: "100", }),
    singleEvents: "true", orderBy: "startTime",
    ...(range ? { maxResults: "2500" } : {}),
  });
  const events: GoogleEvent[] = [];
  let nextPageToken: string | undefined;
  do {
    if (nextPageToken) params.set("pageToken", nextPageToken);
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }
    );
    if (response.status === 401) {
      const error = new Error("Google avvisade access token.");
      error.name = "GoogleTokenExpired";
      throw error;
    }
    const result = await response.json() as GoogleResult;
    if (!response.ok) throw new Error(result.error?.message || "Kalenderhämtningen misslyckades.");
    events.push(...(result.items ?? []));
    nextPageToken = range ? result.nextPageToken : undefined;
  } while (nextPageToken);
  return events.map(event => ({
    id: event.id ?? crypto.randomUUID(),
    title: event.summary ?? "(Utan titel)",
    startTime: event.start?.dateTime ?? event.start?.date ?? null,
    endTime: event.end?.dateTime ?? event.end?.date ?? null,
    location: event.location ?? null,
    allDay: Boolean(event.start?.date && !event.start.dateTime),
    htmlLink: event.htmlLink ?? null,
  }));
}

export async function GET(request: Request) {
  try {
    const range = parseMonth(request);
    const { email, privateKey, calendarId } = getEnvironment();
    let token = await getAccessToken(email, privateKey);
    let events;
    try { events = await fetchEvents(token, calendarId, range); }
    catch (error) {
      if (!(error instanceof Error) || error.name !== "GoogleTokenExpired") throw error;
      if (cachedToken?.accessToken === token) cachedToken = null;
      token = await getAccessToken(email, privateKey);
      events = await fetchEvents(token, calendarId, range);
    }
    return Response.json({ connected: true, calendarId, events });
  } catch (error) {
    console.error("google-school-calendar-fel:", error);
    return Response.json({ connected: false, events: [],
      error: error instanceof Error ? error.message : "Okänt Google Calendar-fel."
    }, { status: error instanceof RangeError ? 400 : 500 });
  }
}
