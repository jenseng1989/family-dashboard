export const dynamic = "force-dynamic";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";

type GoogleTokenResponse = {
  access_token?: string;
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
    serviceAccountPrivateKey =
      Buffer.from(
        privateKeyBase64,
        "base64"
      ).toString("utf8");
  } else if (privateKeyLegacy) {
    serviceAccountPrivateKey =
      privateKeyLegacy.replace(
        /\\n/g,
        "\n"
      );
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
  const now = Math.floor(
    Date.now() / 1000
  );

  const header = base64Url(
    JSON.stringify({
      alg: "RS256",
      typ: "JWT",
    })
  );

  const payload = base64Url(
    JSON.stringify({
      iss: email,
      scope:
        GOOGLE_CALENDAR_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );

  const unsignedToken =
    `${header}.${payload}`;

  const pemContents =
    privateKey
      .replace(
        "-----BEGIN PRIVATE KEY-----",
        ""
      )
      .replace(
        "-----END PRIVATE KEY-----",
        ""
      )
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
          name:
            "RSASSA-PKCS1-v1_5",
          hash: "SHA-256",
        },
        false,
        ["sign"]
      );

    const signature =
      await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        cryptoKey,
        Buffer.from(
          unsignedToken,
          "utf8"
        )
      );

    return `${unsignedToken}.${base64Url(
      new Uint8Array(
        signature
      )
    )}`;
  } catch {
    throw new Error(
      "Google Service Account-private key kunde inte läsas. Kontrollera att GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_BASE64 är korrekt."
    );
  }
}

async function getAccessToken(
  email: string,
  privateKey: string
): Promise<string> {
  const assertion =
    await createJwt(
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
      body:
        new URLSearchParams({
          grant_type:
            "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion,
        }),
      cache: "no-store",
    }
  );

  const data =
    (await response.json()) as GoogleTokenResponse;

  if (
    !response.ok ||
    !data.access_token
  ) {
    throw new Error(
      data.error_description ||
        data.error ||
        "Google kunde inte skapa en access token för servicekontot."
    );
  }

  return data.access_token;
}

async function fetchUpcomingEvents(
  accessToken: string,
  calendarId: string
) {
  const params =
    new URLSearchParams({
      timeMin:
        new Date().toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "10",
    });

  const response =
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarId
      )}/events?${params.toString()}`,
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

  const data =
    (await response.json()) as GoogleCalendarResponse;

  if (!response.ok) {
    throw new Error(
      data.error?.message ||
        "Google Calendar kunde inte hämtas."
    );
  }

  return (data.items ?? []).map(
    (event) => ({
      id:
        event.id ??
        crypto.randomUUID(),
      title:
        event.summary ??
        "(Utan titel)",
      startTime:
        event.start?.dateTime ??
        event.start?.date ??
        null,
      endTime:
        event.end?.dateTime ??
        event.end?.date ??
        null,
      location:
        event.location ??
        null,
      allDay: Boolean(
        event.start?.date &&
          !event.start
            ?.dateTime
      ),
      htmlLink:
        event.htmlLink ??
        null,
    })
  );
}

export async function GET() {
  try {
    const {
      serviceAccountEmail,
      serviceAccountPrivateKey,
      calendarId,
    } =
      getRequiredEnvironment();

    const accessToken =
      await getAccessToken(
        serviceAccountEmail,
        serviceAccountPrivateKey
      );

    const events =
      await fetchUpcomingEvents(
        accessToken,
        calendarId
      );

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
