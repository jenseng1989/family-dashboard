import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type VolcanoItem = {
  name: string;
  country: string;
  eruptionStart: string;
  lastKnownActivity: string;
  eruptionType: string;
  url: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
};

type GeoJsonFeature = {
  geometry?: {
    coordinates?: unknown;
  } | null;
  properties?: Record<
    string,
    unknown
  >;
};

type GeoJsonFeatureCollection = {
  features?: GeoJsonFeature[];
};

type VolcanoPayload = {
  generatedAt: string;
  source: string;
  sourceUrl: string;
  location: string;
  latitude: number;
  longitude: number;
  maxResults: number;
  total: number;
  volcanoes: VolcanoItem[];
};

const GOTHENBURG = {
  latitude: 57.7089,
  longitude: 11.9746,
};

const MAX_VOLCANOES = 12;

const MEMORY_CACHE_TTL_MS =
  60 * 60 * 1000;

const CURRENT_ERUPTIONS_URL =
  "https://volcano.si.edu/gvp_currenteruptions.cfm";

const WFS_ERUPTIONS_URL =
  "https://webservices.volcano.si.edu/geoserver/GVP-VOTW/ows" +
  "?service=WFS" +
  "&version=1.0.0" +
  "&request=GetFeature" +
  "&typeName=GVP-VOTW%3ASmithsonian_VOTW_Holocene_Eruptions" +
  "&outputFormat=application%2Fjson";

let cachedPayload:
  VolcanoPayload | null = null;

let cachedAt = 0;

let inFlight:
  Promise<VolcanoPayload> | null =
  null;

function normalizeKey(
  value: string
): string {
  return value
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      ""
    );
}

function getProperty(
  properties: Record<
    string,
    unknown
  >,
  candidates: string[]
): unknown {
  const normalizedCandidates =
    candidates.map(
      normalizeKey
    );

  for (
    const [
      key,
      value,
    ] of Object.entries(
      properties
    )
  ) {
    if (
      normalizedCandidates.includes(
        normalizeKey(key)
      )
    ) {
      return value;
    }
  }

  return undefined;
}

function getStringProperty(
  properties: Record<
    string,
    unknown
  >,
  candidates: string[]
): string | null {
  const value =
    getProperty(
      properties,
      candidates
    );

  if (
    typeof value ===
      "string" &&
    value.trim()
  ) {
    return value.trim();
  }

  if (
    typeof value ===
      "number" &&
    Number.isFinite(value)
  ) {
    return String(value);
  }

  return null;
}

function getNumberProperty(
  properties: Record<
    string,
    unknown
  >,
  candidates: string[]
): number | null {
  const value =
    getProperty(
      properties,
      candidates
    );

  if (
    typeof value ===
      "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value ===
    "string"
  ) {
    const parsed =
      Number.parseFloat(
        value
      );

    return Number.isFinite(
      parsed
    )
      ? parsed
      : null;
  }

  return null;
}

function isContinuingEruption(
  properties: Record<
    string,
    unknown
  >
): boolean {
  const stopDate =
    getStringProperty(
      properties,
      [
        "End Date",
        "EndDate",
        "Stop Date",
        "StopDate",
        "Eruption Stop Date",
        "EruptionStopDate",
      ]
    );

  const continuing =
    getStringProperty(
      properties,
      [
        "Continuing",
        "Is Continuing",
        "Current",
        "Status",
      ]
    );

  if (continuing) {
    const value =
      continuing.toLowerCase();

    if (
      value.includes(
        "continu"
      ) ||
      value === "yes" ||
      value === "true" ||
      value === "current"
    ) {
      return true;
    }
  }

  return !stopDate;
}

function buildGvpProfileUrl(
  properties: Record<
    string,
    unknown
  >
): string {
  const volcanoNumber =
    getStringProperty(
      properties,
      [
        "Volcano Number",
        "VolcanoNumber",
        "VolcanoNo",
        "VolcanoNum",
      ]
    );

  if (volcanoNumber) {
    return (
      "https://volcano.si.edu/volcano.cfm" +
      `?vn=${encodeURIComponent(
        volcanoNumber
      )}`
    );
  }

  return CURRENT_ERUPTIONS_URL;
}

function getCoordinates(
  feature: GeoJsonFeature,
  properties: Record<
    string,
    unknown
  >
): {
  latitude: number;
  longitude: number;
} | null {
  const coordinates =
    feature.geometry
      ?.coordinates;

  if (
    Array.isArray(
      coordinates
    ) &&
    coordinates.length >= 2
  ) {
    const longitude =
      typeof coordinates[0] ===
      "number"
        ? coordinates[0]
        : Number.parseFloat(
            String(
              coordinates[0]
            )
          );

    const latitude =
      typeof coordinates[1] ===
      "number"
        ? coordinates[1]
        : Number.parseFloat(
            String(
              coordinates[1]
            )
          );

    if (
      Number.isFinite(
        latitude
      ) &&
      Number.isFinite(
        longitude
      )
    ) {
      return {
        latitude,
        longitude,
      };
    }
  }

  const latitude =
    getNumberProperty(
      properties,
      [
        "Latitude",
        "Lat",
      ]
    );

  const longitude =
    getNumberProperty(
      properties,
      [
        "Longitude",
        "Lon",
        "Long",
      ]
    );

  if (
    latitude !== null &&
    longitude !== null
  ) {
    return {
      latitude,
      longitude,
    };
  }

  return null;
}

function toRadians(
  degrees: number
): number {
  return (
    (degrees * Math.PI) /
    180
  );
}

function getDistanceKm(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
): number {
  const earthRadiusKm =
    6371;

  const lat1 =
    toRadians(latitude1);

  const lat2 =
    toRadians(latitude2);

  const deltaLat =
    toRadians(
      latitude2 -
        latitude1
    );

  const deltaLon =
    toRadians(
      longitude2 -
        longitude1
    );

  const a =
    Math.sin(
      deltaLat / 2
    ) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(
        deltaLon / 2
      ) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return (
    earthRadiusKm * c
  );
}

function parseGeoJsonEruptions(
  data: unknown
): VolcanoItem[] {
  if (
    typeof data !==
      "object" ||
    data === null
  ) {
    return [];
  }

  const collection =
    data as
      GeoJsonFeatureCollection;

  if (
    !Array.isArray(
      collection.features
    )
  ) {
    return [];
  }

  const volcanoes:
    VolcanoItem[] = [];

  for (
    const feature of
    collection.features
  ) {
    const properties =
      feature.properties;

    if (!properties) {
      continue;
    }

    if (
      !isContinuingEruption(
        properties
      )
    ) {
      continue;
    }

    const coordinates =
      getCoordinates(
        feature,
        properties
      );

    if (!coordinates) {
      continue;
    }

    const name =
      getStringProperty(
        properties,
        [
          "Volcano Name",
          "VolcanoName",
          "Volcano",
        ]
      );

    if (!name) {
      continue;
    }

    const country =
      getStringProperty(
        properties,
        [
          "Country",
          "CountryName",
        ]
      ) ??
      "Okänt land";

    const eruptionStart =
      getStringProperty(
        properties,
        [
          "Start Date",
          "StartDate",
          "Eruption Start Date",
          "EruptionStartDate",
          "StartYear",
        ]
      ) ??
      "Okänt";

    const lastKnownActivity =
      getStringProperty(
        properties,
        [
          "Last Known Activity",
          "LastActivity",
          "LastKnownActivity",
          "End Date",
          "EndDate",
        ]
      ) ??
      "Fortsatt aktivitet";

    const eruptionType =
      getStringProperty(
        properties,
        [
          "Eruption Type",
          "EruptionType",
          "Activity",
          "Evidence Method",
        ]
      ) ??
      "Pågående utbrott";

    volcanoes.push({
      name,
      country,
      eruptionStart,
      lastKnownActivity,
      eruptionType,
      url:
        buildGvpProfileUrl(
          properties
        ),
      latitude:
        coordinates.latitude,
      longitude:
        coordinates.longitude,
      distanceKm:
        Math.round(
          getDistanceKm(
            GOTHENBURG.latitude,
            GOTHENBURG.longitude,
            coordinates.latitude,
            coordinates.longitude
          )
        ),
    });
  }

  const unique =
    new Map<
      string,
      VolcanoItem
    >();

  for (
    const volcano of
    volcanoes
  ) {
    const key =
      `${volcano.name}-${volcano.country}`.toLowerCase();

    if (!unique.has(key)) {
      unique.set(
        key,
        volcano
      );
    }
  }

  return Array.from(
    unique.values()
  )
    .sort(
      (a, b) =>
        a.distanceKm -
        b.distanceKm
    )
    .slice(
      0,
      MAX_VOLCANOES
    );
}

async function fetchWfsSource():
  Promise<VolcanoItem[]> {
  /*
   * Smithsonian-svaret är cirka
   * 11–12 MB och är större än
   * Next.js vanliga fetch-cache.
   *
   * Därför hämtas källan med
   * no-store, men resultatet
   * cacheas i serverprocessens
   * minne i en timme.
   */
  const response =
    await fetch(
      WFS_ERUPTIONS_URL,
      {
        headers: {
          Accept:
            "application/json",
          "User-Agent":
            "Family-Dashboard/1.0",
        },
        cache:
          "no-store",
      }
    );

  if (!response.ok) {
    throw new Error(
      `Smithsonian WFS svarade med ${response.status}`
    );
  }

  const data: unknown =
    await response.json();

  return parseGeoJsonEruptions(
    data
  );
}

function cacheIsFresh() {
  return (
    cachedPayload !==
      null &&
    Date.now() -
      cachedAt <
      MEMORY_CACHE_TTL_MS
  );
}

async function loadPayload():
  Promise<VolcanoPayload> {
  if (
    cacheIsFresh() &&
    cachedPayload
  ) {
    return cachedPayload;
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    const volcanoes =
      await fetchWfsSource();

    if (
      volcanoes.length === 0
    ) {
      throw new Error(
        "Kunde inte hitta pågående vulkanutbrott med koordinater."
      );
    }

    const payload:
      VolcanoPayload = {
      generatedAt:
        new Date().toISOString(),
      source:
        "Smithsonian Global Volcanism Program",
      sourceUrl:
        CURRENT_ERUPTIONS_URL,
      location:
        "Göteborg",
      latitude:
        GOTHENBURG.latitude,
      longitude:
        GOTHENBURG.longitude,
      maxResults:
        MAX_VOLCANOES,
      total:
        volcanoes.length,
      volcanoes,
    };

    cachedPayload =
      payload;
    cachedAt =
      Date.now();

    return payload;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export async function GET() {
  try {
    const payload =
      await loadPayload();

    return NextResponse.json(
      payload,
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=21600",
        },
      }
    );
  } catch (error) {
    console.error(
      "Kunde inte hämta vulkandata:",
      error
    );

    /*
     * Om källan tillfälligt
     * fallerar men vi har ett
     * äldre minnescachat svar,
     * är gammal data bättre än
     * ett helt trasigt kort.
     */
    if (cachedPayload) {
      return NextResponse.json(
        {
          ...cachedPayload,
          stale: true,
        },
        {
          headers: {
            "Cache-Control":
              "public, s-maxage=300, stale-while-revalidate=3600",
          },
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "Vulkandata kunde inte hämtas.",
      },
      {
        status: 500,
      }
    );
  }
}
