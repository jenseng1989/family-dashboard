import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TOKEN_URL =
  "https://ext-api.vasttrafik.se/token";

const API_BASE =
  "https://ext-api.vasttrafik.se/pr/v4";

const STOP_NAME =
  "Vågmästareplatsen";

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
};

type LocationItem = {
  gid?: string;
  name?: string;
  locationType?: string;
};

type LocationsResponse = {
  results?: LocationItem[];
};

type DepartureLine = {
  name?: string;
  shortName?: string;
  designation?: string;
  backgroundColor?: string;
  foregroundColor?: string;
};

type DepartureServiceJourney = {
  direction?: string;
  line?: DepartureLine;
};

type DepartureItem = {
  estimatedTime?: string;
  plannedTime?: string;
  estimatedOtherwisePlannedTime?: string;
  isCancelled?: boolean;
  serviceJourney?: DepartureServiceJourney;
  line?: DepartureLine;
  direction?: string;
};

type DeparturesResponse = {
  results?: DepartureItem[];
};

function getBasicCredential(): string {
  const authKey =
    process.env.VASTTRAFIK_AUTH_KEY?.trim();

  if (authKey) {
    return authKey;
  }

  const clientId =
    process.env.VASTTRAFIK_CLIENT_ID?.trim();
  const clientSecret =
    process.env.VASTTRAFIK_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error(
      "Västtrafik-credentials saknas i serverns miljövariabler."
    );
  }

  return Buffer.from(
    `${clientId}:${clientSecret}`
  ).toString("base64");
}

async function getAccessToken(): Promise<string> {
  const credential =
    getBasicCredential();

  const response =
    await fetch(
      TOKEN_URL,
      {
        method: "POST",
        headers: {
          Authorization:
            `Basic ${credential}`,
          "Content-Type":
            "application/x-www-form-urlencoded",
          Accept:
            "application/json",
        },
        body: new URLSearchParams({
          grant_type:
            "client_credentials",
        }),
        cache:
          "no-store",
      }
    );

  if (!response.ok) {
    const body =
      await response.text();

    console.error(
      "Västtrafik tokenfel:",
      response.status,
      body
    );

    throw new Error(
      `Västtrafik autentisering misslyckades (${response.status}).`
    );
  }

  const data =
    (await response.json()) as TokenResponse;

  if (!data.access_token) {
    throw new Error(
      "Västtrafik returnerade ingen accesstoken."
    );
  }

  return data.access_token;
}

async function vasttrafikFetch<T>(
  path: string,
  token: string
): Promise<T> {
  const response =
    await fetch(
      `${API_BASE}${path}`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
          Accept:
            "application/json",
        },
        cache:
          "no-store",
      }
    );

  if (!response.ok) {
    const body =
      await response.text();

    console.error(
      `Västtrafik API-fel för ${path}:`,
      response.status,
      body
    );

    throw new Error(
      `Västtrafik API svarade med ${response.status}: ${body.slice(0, 500)}`
    );
  }

  return (
    await response.json()
  ) as T;
}

function normalizeName(
  value: string
): string {
  return value
    .trim()
    .toLocaleLowerCase(
      "sv-SE"
    );
}

async function getStopArea(
  token: string
): Promise<LocationItem> {
  const params =
  new URLSearchParams({
    q: STOP_NAME,
    limit: "10",
    offset: "0",
  });

  const data =
    await vasttrafikFetch<LocationsResponse>(
      `/locations/by-text?${params.toString()}`,
      token
    );

  const results =
    data.results ?? [];

  const exact =
    results.find(
      (location) =>
        location.gid &&
        location.name &&
        normalizeName(
          location.name
        ) ===
          normalizeName(
            STOP_NAME
          )
    );

  const fallback =
    results.find(
      (location) =>
        location.gid &&
        location.name
          ?.toLocaleLowerCase(
            "sv-SE"
          )
          .includes(
            "vågmästareplatsen"
          )
    );

  const stop =
    exact ??
    fallback;

  if (!stop?.gid) {
    throw new Error(
      "Vågmästareplatsen kunde inte hittas i Västtrafiks API."
    );
  }

  return stop;
}

function getDepartureTime(
  departure:
    DepartureItem
): string | null {
  return (
    departure.estimatedTime ??
    departure.estimatedOtherwisePlannedTime ??
    departure.plannedTime ??
    null
  );
}

function getDelayMinutes(
  departure:
    DepartureItem
): number | null {
  if (
    !departure.plannedTime ||
    !departure.estimatedTime
  ) {
    return null;
  }

  const planned =
    new Date(
      departure.plannedTime
    ).getTime();

  const estimated =
    new Date(
      departure.estimatedTime
    ).getTime();

  if (
    !Number.isFinite(planned) ||
    !Number.isFinite(estimated)
  ) {
    return null;
  }

  return Math.round(
    (estimated - planned) /
      60_000
  );
}

export async function GET() {
  try {
    const token =
      await getAccessToken();

    const stop =
      await getStopArea(
        token
      );

    const params =
      new URLSearchParams({
        timeSpanInMinutes: "120",
        maxDeparturesPerLineAndDirection: "2",
        limit: "20",
        offset: "0",
        includeOccupancy: "false",
      });

    const data =
      await vasttrafikFetch<DeparturesResponse>(
        `/stop-areas/${encodeURIComponent(
          stop.gid as string
        )}/departures?${params.toString()}`,
        token
      );

    const now =
      Date.now();

    const departures =
      (data.results ?? [])
        .map(
          (
            departure,
            index
          ) => {
            const time =
              getDepartureTime(
                departure
              );

            const line =
              departure.serviceJourney
                ?.line ??
              departure.line;

            const direction =
              departure.serviceJourney
                ?.direction ??
              departure.direction ??
              "Okänd destination";

            const lineName =
              line?.shortName ??
              line?.designation ??
              line?.name ??
              "–";

            const timestamp =
              time
                ? new Date(
                    time
                  ).getTime()
                : NaN;

            const minutes =
              Number.isFinite(
                timestamp
              )
                ? Math.max(
                    0,
                    Math.round(
                      (
                        timestamp -
                        now
                      ) /
                        60_000
                    )
                  )
                : null;

            return {
              id:
                `${time ?? "unknown"}-${lineName}-${direction}-${index}`,
              line:
                lineName,
              direction,
              departureTime:
                time,
              plannedTime:
                departure.plannedTime ??
                null,
              minutes,
              delayMinutes:
                getDelayMinutes(
                  departure
                ),
              cancelled:
                departure.isCancelled ??
                false,
              backgroundColor:
                line?.backgroundColor ??
                null,
              foregroundColor:
                line?.foregroundColor ??
                null,
            };
          }
        )
        .filter(
          (departure) =>
            departure.departureTime
        )
        .sort(
          (
            first,
            second
          ) =>
            new Date(
              first.departureTime as string
            ).getTime() -
            new Date(
              second.departureTime as string
            ).getTime()
        )
        .slice(
          0,
          8
        );

    return NextResponse.json(
      {
        stop: {
          name:
            stop.name ??
            STOP_NAME,
          gid:
            stop.gid,
        },
        departures,
        updatedAt:
          new Date().toISOString(),
        source:
          "Västtrafik",
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=30, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    console.error(
      "Kunde inte hämta Västtrafik-data:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Västtrafik-data kunde inte hämtas.",
      },
      {
        status:
          502,
      }
    );
  }
}