import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const revalidate = 21600;

type SatelliteDefinition = {
  id: number;
  displayName: string;
  emoji: string;
  description: string;
};

type N2yoPass = {
  startAzCompass: string;
  startUTC: number;
  maxAzCompass: string;
  maxEl: number;
  maxUTC: number;
  endAzCompass: string;
  endUTC: number;
  mag: number;
  duration: number;
};

type N2yoResponse = {
  info?: {
    satname?: string;
  };
  passes?: N2yoPass[];
  error?: string;
};

const GOTHENBURG = {
  latitude: 57.7089,
  longitude: 11.9746,
  altitudeMeters: 10,
};

const PREDICTION_DAYS = 7;
const MIN_VISIBILITY_SECONDS = 60;

const SUCCESS_CACHE_MS = 6 * 60 * 60 * 1000;
const RATE_LIMIT_COOLDOWN_MS = 60 * 60 * 1000;

type SatelliteResult = Awaited<
  ReturnType<typeof getSatellitePass>
>;

type SatellitesPayload = {
  location: string;
  predictionDays: number;
  generatedAt: string;
  satellites: Array<
    SatelliteResult | {
      id: number;
      name: string;
      apiName: string;
      emoji: string;
      description: string;
      n2yoUrl: string;
      nextPass: null;
      error: string;
    }
  >;
};

let successfulCache:
  | {
      payload: SatellitesPayload;
      expiresAt: number;
    }
  | null = null;

let inFlightRequest:
  | Promise<SatellitesPayload>
  | null = null;

let rateLimitUntil = 0;

function isRateLimitError(
  reason: unknown
): boolean {
  return (
    reason instanceof Error &&
    reason.message
      .toLowerCase()
      .includes(
        "exceeded the number of transactions"
      )
  );
}

function buildUnavailableSatellite(
  satellite: SatelliteDefinition,
  error: string
) {
  return {
    id: satellite.id,
    name: satellite.displayName,
    apiName: satellite.displayName,
    emoji: satellite.emoji,
    description: satellite.description,
    n2yoUrl: `https://www.n2yo.com/satellite/?s=${satellite.id}`,
    nextPass: null,
    error,
  };
}

function buildRateLimitPayload(): SatellitesPayload {
  return {
    location: "Göteborg",
    predictionDays: PREDICTION_DAYS,
    generatedAt: new Date().toISOString(),
    satellites: SATELLITES.map((satellite) =>
      buildUnavailableSatellite(
        satellite,
        "N2YO:s anropsgräns är tillfälligt uppnådd."
      )
    ),
  };
}

async function loadSatellites(
  apiKey: string
): Promise<SatellitesPayload> {
  const results = await Promise.allSettled(
    SATELLITES.map((satellite) =>
      getSatellitePass(satellite, apiKey)
    )
  );

  const rateLimited = results.some(
    (result) =>
      result.status === "rejected" &&
      isRateLimitError(result.reason)
  );

  if (rateLimited) {
    rateLimitUntil =
      Date.now() + RATE_LIMIT_COOLDOWN_MS;

    if (successfulCache) {
      console.warn(
        "N2YO:s anropsgräns är uppnådd. Använder senast lyckade satellitdata."
      );

      return successfulCache.payload;
    }
  }

  const satellites = results.map(
    (result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      }

      console.error(
        `Kunde inte hämta ${SATELLITES[index].displayName}:`,
        result.reason
      );

      return buildUnavailableSatellite(
        SATELLITES[index],
        isRateLimitError(result.reason)
          ? "N2YO:s anropsgräns är tillfälligt uppnådd."
          : "Kunde inte hämta passage."
      );
    }
  );

  const payload: SatellitesPayload = {
    location: "Göteborg",
    predictionDays: PREDICTION_DAYS,
    generatedAt: new Date().toISOString(),
    satellites,
  };

  const allSucceeded = results.every(
    (result) => result.status === "fulfilled"
  );

  if (allSucceeded) {
    successfulCache = {
      payload,
      expiresAt:
        Date.now() + SUCCESS_CACHE_MS,
    };

    rateLimitUntil = 0;
  }

  return payload;
}


const SATELLITES: SatelliteDefinition[] = [
  {
    id: 25544,
    displayName: "ISS",
    emoji: "🛰️",
    description: "Internationella rymdstationen",
  },
  {
    id: 48274,
    displayName: "Tiangong",
    emoji: "🇨🇳",
    description: "Kinas rymdstation",
  },
  {
    id: 20580,
    displayName: "Hubble",
    emoji: "🔭",
    description: "Hubble Space Telescope",
  },
  {
    id: 33591,
    displayName: "NOAA 19",
    emoji: "🌦️",
    description: "Vädersatellit i polär bana",
  },
];

function getSatelliteUrl(
  satelliteId: number,
  apiKey: string
): string {
  return (
    "https://api.n2yo.com/rest/v1/satellite/visualpasses/" +
    `${satelliteId}/` +
    `${GOTHENBURG.latitude}/` +
    `${GOTHENBURG.longitude}/` +
    `${GOTHENBURG.altitudeMeters}/` +
    `${PREDICTION_DAYS}/` +
    `${MIN_VISIBILITY_SECONDS}/` +
    `&apiKey=${encodeURIComponent(apiKey)}`
  );
}

async function getSatellitePass(
  satellite: SatelliteDefinition,
  apiKey: string
) {
  const response = await fetch(
    getSatelliteUrl(satellite.id, apiKey),
    {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `N2YO svarade med status ${response.status}`
    );
  }

  const data = (await response.json()) as N2yoResponse;

  if (data.error) {
    throw new Error(data.error);
  }

  const nextPass =
    Array.isArray(data.passes) && data.passes.length > 0
      ? data.passes[0]
      : null;

  return {
    id: satellite.id,
    name: satellite.displayName,
    apiName: data.info?.satname ?? satellite.displayName,
    emoji: satellite.emoji,
    description: satellite.description,
    n2yoUrl: `https://www.n2yo.com/satellite/?s=${satellite.id}`,
    nextPass: nextPass
      ? {
          startUTC: nextPass.startUTC,
          maxUTC: nextPass.maxUTC,
          endUTC: nextPass.endUTC,
          durationSeconds: nextPass.duration,
          maxElevation: nextPass.maxEl,
          startDirection: nextPass.startAzCompass,
          maxDirection: nextPass.maxAzCompass,
          endDirection: nextPass.endAzCompass,
          magnitude:
            nextPass.mag === 100000 ? null : nextPass.mag,
        }
      : null,
  };
}

export async function GET() {
  const apiKey = process.env.N2YO_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "N2YO_API_KEY saknas i serverns miljövariabler.",
      },
      { status: 500 }
    );
  }

  const now = Date.now();

  if (
    successfulCache &&
    successfulCache.expiresAt > now
  ) {
    return NextResponse.json(
      successfulCache.payload,
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=21600, stale-while-revalidate=21600",
          "X-Satellite-Cache": "HIT",
        },
      }
    );
  }

  if (rateLimitUntil > now) {
    const payload =
      successfulCache?.payload ??
      buildRateLimitPayload();

    return NextResponse.json(
      payload,
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Satellite-Cache":
            successfulCache
              ? "STALE"
              : "RATE-LIMITED",
        },
      }
    );
  }

  if (!inFlightRequest) {
    inFlightRequest = loadSatellites(
      apiKey
    ).finally(() => {
      inFlightRequest = null;
    });
  }

  const payload = await inFlightRequest;

  const hasFreshCache =
    successfulCache?.payload === payload &&
    successfulCache.expiresAt >
      Date.now();

  return NextResponse.json(
    payload,
    {
      headers: {
        "Cache-Control": hasFreshCache
          ? "public, s-maxage=21600, stale-while-revalidate=21600"
          : "no-store",
        "X-Satellite-Cache":
          hasFreshCache
            ? "MISS"
            : rateLimitUntil >
                Date.now()
              ? successfulCache
                ? "STALE"
                : "RATE-LIMITED"
              : "ERROR",
      },
    }
  );
}
