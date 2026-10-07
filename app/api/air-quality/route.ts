import { NextResponse } from "next/server";

const AQICN_BASE = "https://api.waqi.info";

const REQUEST_TIMEOUT_MS = 8_000;
const AIR_QUALITY_MEMORY_CACHE_MS = 5 * 60 * 1000;
const AIR_QUALITY_STALE_CACHE_MS = 60 * 60 * 1000;
const AQICN_COOLDOWN_MS = 10 * 60 * 1000;

let cachedAirQuality: AqicnData | null = null;
let cachedAt = 0;
let inFlight: Promise<AqicnData> | null = null;
let aqicnBlockedUntil = 0;

type IaqiValue = {
  v?: number;
};

type AqicnData = {
  aqi?: number | string;
  dominentpol?: string;
  city?: {
    name?: string;
    url?: string;
    geo?: Array<number | string>;
  };
  time?: {
    s?: string;
    tz?: string;
    v?: number;
    iso?: string;
  };
  iaqi?: {
    pm25?: IaqiValue;
    pm10?: IaqiValue;
    no2?: IaqiValue;
  };
  attributions?: Array<{
    name?: string;
    url?: string;
  }>;
};

type AqicnResponse = {
  status?: string;
  data?: AqicnData | string;
};

function getNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

function getAqiLevel(aqi: number | null) {
  if (aqi === null) {
    return {
      key: "unknown",
      label: "Ingen bedömning",
      summary:
        "Det finns inte tillräckligt med data för en samlad bedömning just nu.",
    };
  }

  if (aqi <= 50) {
    return {
      key: "good",
      label: "Bra",
      summary: "Luftkvaliteten är bra just nu.",
    };
  }

  if (aqi <= 100) {
    return {
      key: "moderate",
      label: "Måttlig",
      summary: "Luftkvaliteten är måttlig just nu.",
    };
  }

  if (aqi <= 150) {
    return {
      key: "sensitive",
      label: "Förhöjd",
      summary:
        "Luftkvaliteten är förhöjd och kan påverka känsliga personer.",
    };
  }

  if (aqi <= 200) {
    return {
      key: "unhealthy",
      label: "Dålig",
      summary: "Luftkvaliteten är dålig just nu.",
    };
  }

  if (aqi <= 300) {
    return {
      key: "very-unhealthy",
      label: "Mycket dålig",
      summary: "Luftkvaliteten är mycket dålig just nu.",
    };
  }

  return {
    key: "hazardous",
    label: "Extremt dålig",
    summary: "Luftkvaliteten är extremt dålig just nu.",
  };
}

async function aqicnFetch(
  path: string,
  token: string
): Promise<AqicnData> {
  if (Date.now() < aqicnBlockedUntil) {
    throw new Error("AQICN_COOLDOWN");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(
      `${AQICN_BASE}${path}${path.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`,
      {
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
        cache: "no-store",
      }
    );

    if (response.status === 429) {
      aqicnBlockedUntil =
        Date.now() + AQICN_COOLDOWN_MS;

      throw new Error("AQICN_RATE_LIMIT");
    }

    if (!response.ok) {
      const body = await response.text();

      throw new Error(
        `AQICN svarade med ${response.status}: ${body.slice(0, 300)}`
      );
    }

    const result =
      (await response.json()) as AqicnResponse;

    if (
      result.status !== "ok" ||
      !result.data ||
      typeof result.data === "string"
    ) {
      throw new Error(
        typeof result.data === "string"
          ? `AQICN: ${result.data}`
          : "AQICN returnerade inget användbart luftkvalitetssvar."
      );
    }

    return result.data;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      aqicnBlockedUntil =
        Date.now() + AQICN_COOLDOWN_MS;

      throw new Error(
        `AQICN svarade inte inom ${REQUEST_TIMEOUT_MS / 1000} sekunder.`
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getGothenburgAirQuality(
  token: string
): Promise<AqicnData> {
  const candidates = [
    "/feed/sweden/goteborg-femman/",
    "/feed/gothenburg/",
    "/feed/goteborg/",
  ];

  let lastError: unknown = null;

  for (const path of candidates) {
    try {
      const data = await aqicnFetch(path, token);

      if (
        data.city?.name ||
        typeof data.aqi === "number"
      ) {
        return data;
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(
        "Ingen AQICN-feed för Göteborg kunde hämtas."
      );
}

function isFreshCache() {
  return (
    cachedAirQuality !== null &&
    Date.now() - cachedAt <
      AIR_QUALITY_MEMORY_CACHE_MS
  );
}

function canUseStaleCache() {
  return (
    cachedAirQuality !== null &&
    Date.now() - cachedAt <
      AIR_QUALITY_STALE_CACHE_MS
  );
}

async function getAirQualityData(
  token: string
): Promise<{
  data: AqicnData;
  stale: boolean;
}> {
  if (isFreshCache() && cachedAirQuality) {
    return {
      data: cachedAirQuality,
      stale: false,
    };
  }

  if (!inFlight) {
    inFlight = getGothenburgAirQuality(token);
  }

  try {
    const data = await inFlight;

    cachedAirQuality = data;
    cachedAt = Date.now();

    return {
      data,
      stale: false,
    };
  } catch (error) {
    if (canUseStaleCache() && cachedAirQuality) {
      console.warn(
        "AQICN kunde inte uppdateras. Visar senast cacheade luftkvalitetsdata."
      );

      return {
        data: cachedAirQuality,
        stale: true,
      };
    }

    throw error;
  } finally {
    inFlight = null;
  }
}

export async function GET() {
  try {
    const token =
      process.env.AQICN_API_TOKEN?.trim();

    if (!token) {
      return NextResponse.json(
        {
          error:
            "AQICN_API_TOKEN saknas i serverns miljövariabler.",
        },
        {
          status: 500,
        }
      );
    }

    const {
      data,
      stale,
    } = await getAirQualityData(token);

    const aqi =
      typeof data.aqi === "number"
        ? data.aqi
        : typeof data.aqi === "string" &&
            data.aqi !== "-"
          ? Number(data.aqi)
          : null;

    const normalizedAqi =
      typeof aqi === "number" &&
      Number.isFinite(aqi)
        ? aqi
        : null;

    const level =
      getAqiLevel(normalizedAqi);

    const pm25 =
      getNumber(data.iaqi?.pm25?.v);
    const pm10 =
      getNumber(data.iaqi?.pm10?.v);
    const no2 =
      getNumber(data.iaqi?.no2?.v);

    const measuredAt =
      data.time?.iso ??
      data.time?.s ??
      null;

    return NextResponse.json(
      {
        station:
          data.city?.name ??
          "Göteborg",
        aqi: normalizedAqi,
        level,
        pollutants: {
          pm25,
          pm10,
          no2,
        },
        dominantPollutant:
          data.dominentpol ?? null,
        measuredAt,
        updatedAt:
          new Date().toISOString(),
        stale,
        source:
          "World Air Quality Index Project",
        note:
          "PM2.5, PM10 och NO₂ visas som individuella AQI-värden från AQICN, inte som rå koncentration i µg/m³.",
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error(
      "Kunde inte hämta luftkvalitet:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Luftkvaliteten kunde inte hämtas.",
      },
      {
        status: 502,
      }
    );
  }
}
