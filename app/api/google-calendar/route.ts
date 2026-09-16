export const dynamic = "force-dynamic";

const GOOGLE_TOKEN_URL =
  "https://oauth2.googleapis.com/token";

const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";

// Förnya token 5 minuter innan den går ut.
const TOKEN_EXPIRY_MARGIN_MS = 5 * 60 * 1000;

// Reservvärde om Google inte skickar expires_in.
const DEFAULT_TOKEN_LIFETIME_SECONDS = 3600;

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
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

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

// Cache i serverminnet.
// Delas inom samma serverinstans, inte mellan olika
// Vercel-instanser.
let cachedToken: CachedToken | null = null;

// Hindrar samtidiga anrop från att begära varsin token.
let pendingTokenRequest: Promise<string> | null = null;

function getRequiredEnvironment() {
  const serviceAccountEmail =
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  const privateKeyBase64 =
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_BASE64;

  const privateKeyLegacy =
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  const calendarId =
    process.env.GOOGLE_CALENDAR_ID;

  let serviceAccountPrivateKey = "";

  if (privateKeyBase64) {
    serviceAccountPrivateKey = Buffer.from(
      privateKeyBase64,
      "base64"
    ).toString("utf8");
  } else if (privateKeyLegacy) {
    serviceAccountPrivateKey =
      privateKeyLegacy.replace(/\\n/g, "\n");
  }

  if (
    !serviceAccountEmail ||
    !serviceAccountPrivateKey ||
    !calendarId
  ) {
    throw new Error(
      "Google Calendar saknar GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_BASE64 eller GOOGLE_CALENDAR_ID."
    );
  }

  return {
    serviceAccountEmail,
    serviceAccountPrivateKey,
    calendarId,
  };
}

function base64Url(
  value: string | Uint8Array
): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function createJwt(
  email: string,
  privateKey: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = base64Url(
    JSON.stringify({
      alg: "RS256",
      typ: "JWT",
    })
  );

  const payload = base64Url(
    JSON.stringify({
      iss: email,
      scope: GOOGLE_CALENDAR_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );

  const unsignedToken = `${header}.${payload}`;

  const pemContents = privateKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  if (!pemContents) {
    throw new Error(
      "Service account-nyckeln är tom eller har fel format."
    );
  }

  const keyData = Buffer.from(
    pemContents,
    "base64"
  );

  try {
    const cryptoKey =
      await crypto.subtle.importKey(
        "pkcs8",
        keyData,
        {
          name: "RSASSA-PKCS1-v1_5",
          hash: "SHA-256",
        },
        false,
        ["sign"]
      );

    const signature =
      await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        cryptoKey,
        Buffer.from(unsignedToken, "utf8")
      );

    return `${unsignedToken}.${base64Url(
      new Uint8Array(signature)
    )}`;
  } catch {
    throw new Error(
      "Google Service Account-private key kunde inte läsas. Kontrollera att GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_BASE64 är korrekt."
    );
  }
}

async function requestNewAccessToken(
  email: string,
  privateKey: string
): Promise<string> {
  const assertion = await createJwt(
    email,
    privateKey
  );

  const response = await fetch(
    GOOGLE_TOKEN_URL,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type:
          "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
      cache: "no-store",
    }
  );

  const data =
    (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description ||
        data.error ||
        "Google kunde inte skapa en access token för servicekontot."
    );
  }

  const lifetimeSeconds =
    typeof data.expires_in === "number" &&
    Number.isFinite(data.expires_in) &&
    data.expires_in > 0
      ? data.expires_in
      : DEFAULT_TOKEN_LIFETIME_SECONDS;

  cachedToken = {
    accessToken: data.access_token,
    expiresAt:
      Date.now() + lifetimeSeconds * 1000,
  };

  return data.access_token;
}

function hasValidCachedToken(): boolean {
  return Boolean(
    cachedToken &&
      Date.now() <
        cachedToken.expiresAt -
          TOKEN_EXPIRY_MARGIN_MS
  );
}

async function getAccessToken(
  email: string,
  privateKey: string
): Promise<string> {
  // Återanvänd token om den fortfarande är giltig.
  if (hasValidCachedToken() && cachedToken) {
    return cachedToken.accessToken;
  }

  // Om en tokenhämtning redan pågår delar vi
  // samma Promise mellan samtidiga anrop.
  if (pendingTokenRequest) {
    return pendingTokenRequest;
  }

  const request = requestNewAccessToken(
    email,
    privateKey
  );

  pendingTokenRequest = request;

  try {
    return await request;
  } finally {
    if (pendingTokenRequest === request) {
      pendingTokenRequest = null;
    }
  }
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

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  // Hanteras separat i GET så att en ogiltig
  // token kan förnyas och anropet göras om.
  if (response.status === 401) {
    const error = new Error(
      "Google Calendar avvisade access token."
    );

    error.name = "GoogleTokenExpired";

    throw error;
  }

  const data =
    (await response.json()) as GoogleCalendarResponse;

  if (!response.ok) {
    throw new Error(
      data.error?.message ||
        "Google Calendar kunde inte hämtas."
    );
  }

  return (data.items ?? []).map((event) => ({
    id: event.id ?? crypto.randomUUID(),
    title: event.summary ?? "(Utan titel)",
    startTime:
      event.start?.dateTime ??
      event.start?.date ??
      null,
    endTime:
      event.end?.dateTime ??
      event.end?.date ??
      null,
    location: event.location ?? null,
    allDay: Boolean(
      event.start?.date &&
        !event.start?.dateTime
    ),
    htmlLink: event.htmlLink ?? null,
  }));
}

export async function GET() {
  try {
    const {
      serviceAccountEmail,
      serviceAccountPrivateKey,
      calendarId,
    } = getRequiredEnvironment();

    let accessToken = await getAccessToken(
      serviceAccountEmail,
      serviceAccountPrivateKey
    );

    let events;

    try {
      events = await fetchUpcomingEvents(
        accessToken,
        calendarId
      );
    } catch (error) {
      // Förnya token och försök en gång till
      // om Google svarar med HTTP 401.
      if (
        !(error instanceof Error) ||
        error.name !== "GoogleTokenExpired"
      ) {
        throw error;
      }

      // Rensa endast den token som avvisades.
      // En annan förfrågan kan redan ha hunnit
      // förnya cachen.
      if (
        cachedToken?.accessToken === accessToken
      ) {
        cachedToken = null;
      }

      accessToken = await getAccessToken(
        serviceAccountEmail,
        serviceAccountPrivateKey
      );

      events = await fetchUpcomingEvents(
        accessToken,
        calendarId
      );
    }

    return Response.json({
      connected: true,
      calendarId,
      events,
    });
  } catch (error) {
    console.error(
      "Google Calendar-fel:",
      error
    );

    return Response.json(
      {
        connected: false,
        events: [],
        error:
          error instanceof Error
            ? error.message
            : "Okänt Google Calendar-fel.",
      },
      {
        status: 500,
      }
    );
  }
}