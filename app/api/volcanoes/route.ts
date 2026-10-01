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

type RssVolcano = {
  name: string;
  country: string;
  eruptionStart: string;
  lastKnownActivity: string;
  eruptionType: string;
  url: string;
  latitude: number;
  longitude: number;
};

const GOTHENBURG = {
  latitude: 57.7089,
  longitude: 11.9746,
};

const MAX_VOLCANOES = 12;

const MEMORY_CACHE_TTL_MS =
  60 * 60 * 1000;

const FAILURE_COOLDOWN_MS =
  5 * 60 * 1000;

const RSS_MAX_ATTEMPTS = 3;
const RSS_RETRY_DELAY_MS = 700;

const WEEKLY_REPORT_URL =
  "https://volcano.si.edu/reports_weekly.cfm";

const WEEKLY_RSS_URL =
  "https://volcano.si.edu/news/WeeklyVolcanoRSS.xml";

let cachedPayload:
  VolcanoPayload | null = null;

let cachedAt = 0;

let failureCooldownUntil = 0;

let lastFetchError: unknown = null;

let inFlight:
  Promise<VolcanoPayload> | null = null;

function decodeXml(value: string): string {
  return value
    .replace(
      /<!\[CDATA\[([\s\S]*?)\]\]>/g,
      "$1"
    )
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(
      /&#(\d+);/g,
      (_, code: string) =>
        String.fromCharCode(
          Number.parseInt(code, 10)
        )
    )
    .replace(
      /&#x([0-9a-f]+);/gi,
      (_, code: string) =>
        String.fromCharCode(
          Number.parseInt(code, 16)
        )
    );
}

function stripHtml(value: string): string {
  return decodeXml(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getXmlValue(
  xml: string,
  tagNames: string[]
): string | null {
  for (const tagName of tagNames) {
    const escapedTag =
      tagName.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

    const expression =
      new RegExp(
        `<${escapedTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedTag}>`,
        "i"
      );

    const match = xml.match(expression);

    if (match?.[1]) {
      const value =
        stripHtml(match[1]);

      if (value) {
        return value;
      }
    }
  }

  return null;
}

function parseCoordinates(
  value: string | null
): {
  latitude: number;
  longitude: number;
} | null {
  if (!value) {
    return null;
  }

  const parts =
    value
      .trim()
      .split(/\s+/)
      .map((part) =>
        Number.parseFloat(part)
      );

  if (
    parts.length < 2 ||
    !Number.isFinite(parts[0]) ||
    !Number.isFinite(parts[1])
  ) {
    return null;
  }

  return {
    latitude: parts[0],
    longitude: parts[1],
  };
}

function parseTitle(title: string): {
  name: string;
  country: string;
} {
  const trimmed = title.trim();

  /*
   * Feedens titel har historiskt använt
   * "Vulkan (Land)" för rapportposter.
   * Om formatet ändras behåller vi hela
   * titeln som namn i stället för att
   * kasta posten.
   */
  /*
   * GeoRSS-titeln kan exempelvis vara:
   * "Sheveluch (Russia) - Report for 10 September-16 September 2026".
   *
   * Landet ska därför läsas ur parentesen direkt efter
   * vulkannamnet. Rapportperioden efter parentesen är metadata
   * och får inte tolkas som land.
   */
  const match =
    trimmed.match(
      /^(.+?)\s*\(([^()]+)\)(?:\s*[-–—]\s*Report\b[\s\S]*)?$/i
    );

  if (match) {
    return {
      name: match[1].trim(),
      country: match[2].trim(),
    };
  }

  /*
   * Fallback om Smithsonian någon gång levererar en titel utan
   * landparentes. Vi behåller då hela titeln som namn i stället
   * för att riskera att rapportmetadata blir ett felaktigt land.
   */

  return {
    name: trimmed,
    country: "Okänt land",
  };
}

function normalizeReportType(
  category: string | null,
  description: string
): string {
  const combined =
    `${category ?? ""} ${description}`
      .toLowerCase();

  if (
    combined.includes(
      "new eruptive activity"
    ) ||
    combined.includes(
      "activity (new)"
    )
  ) {
    return "Ny eruptiv aktivitet";
  }

  if (
    combined.includes(
      "continuing eruptive activity"
    ) ||
    combined.includes(
      "activity (continuing)"
    )
  ) {
    return "Fortsatt eruptiv aktivitet";
  }

  if (
    combined.includes("new unrest") ||
    combined.includes("unrest (new)")
  ) {
    return "Ny vulkanisk oro";
  }

  if (
    combined.includes(
      "continuing unrest"
    ) ||
    combined.includes(
      "unrest (continuing)"
    )
  ) {
    return "Fortsatt vulkanisk oro";
  }

  if (
    combined.includes("other")
  ) {
    return "Övrig aktivitet";
  }

  return (
    category?.trim() ||
    "Aktuell vulkanisk aktivitet"
  );
}

function extractEruptionStart(
  description: string
): string {
  const patterns = [
    /eruption start date\s*:?\s*([^.;<]+)/i,
    /eruption started\s+(?:on\s+)?([^.;<]+)/i,
    /eruption (?:likely )?began\s+(?:on\s+)?([^.;<]+)/i,
    /eruption (?:likely )?started\s+(?:on\s+)?([^.;<]+)/i,
  ];

  for (const pattern of patterns) {
    const match =
      description.match(pattern);

    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }

  return "Ej angivet";
}

function formatActivityDate(
  pubDate: string | null
): string {
  if (!pubDate) {
    return "Aktuell veckorapport";
  }

  const parsed =
    new Date(pubDate);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return pubDate;
  }

  return parsed.toLocaleDateString(
    "sv-SE",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }
  );
}

function parseWeeklyRss(
  xml: string
): RssVolcano[] {
  const items =
    xml.match(
      /<item\b[\s\S]*?<\/item>/gi
    ) ?? [];

  const volcanoes:
    RssVolcano[] = [];

  for (const item of items) {
    const title =
      getXmlValue(item, [
        "title",
      ]);

    const point =
      getXmlValue(item, [
        "georss:point",
        "point",
      ]);

    if (!title || !point) {
      continue;
    }

    const coordinates =
      parseCoordinates(point);

    if (!coordinates) {
      continue;
    }

    const {
      name,
      country,
    } = parseTitle(title);

    if (!name) {
      continue;
    }

    const description =
      getXmlValue(item, [
        "description",
        "content:encoded",
      ]) ?? "";

    const category =
      getXmlValue(item, [
        "category",
      ]);

    const pubDate =
      getXmlValue(item, [
        "pubDate",
        "dc:date",
      ]);

    const link =
      getXmlValue(item, [
        "link",
        "guid",
      ]) ??
      WEEKLY_REPORT_URL;

    volcanoes.push({
      name,
      country,
      eruptionStart:
        extractEruptionStart(
          description
        ),
      lastKnownActivity:
        formatActivityDate(
          pubDate
        ),
      eruptionType:
        normalizeReportType(
          category,
          description
        ),
      url: link,
      latitude:
        coordinates.latitude,
      longitude:
        coordinates.longitude,
    });
  }

  const unique =
    new Map<
      string,
      RssVolcano
    >();

  for (const volcano of volcanoes) {
    const key =
      `${volcano.name}-${volcano.latitude}-${volcano.longitude}`
        .toLowerCase();

    if (!unique.has(key)) {
      unique.set(
        key,
        volcano
      );
    }
  }

  return Array.from(
    unique.values()
  );
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
  const earthRadiusKm = 6371;

  const lat1 =
    toRadians(latitude1);

  const lat2 =
    toRadians(latitude2);

  const deltaLat =
    toRadians(
      latitude2 - latitude1
    );

  const deltaLon =
    toRadians(
      longitude2 - longitude1
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

  return earthRadiusKm * c;
}

function wait(
  milliseconds: number
): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(
      resolve,
      milliseconds
    );
  });
}

function isRetryableFetchError(
  error: unknown
): boolean {
  if (
    error instanceof TypeError &&
    error.message === "fetch failed"
  ) {
    return true;
  }

  if (error instanceof Error) {
    const message =
      error.message.toLowerCase();

    return (
      message.includes(
        "econnreset"
      ) ||
      message.includes(
        "socket"
      ) ||
      message.includes(
        "network"
      )
    );
  }

  return false;
}

async function fetchWeeklyRss():
  Promise<RssVolcano[]> {
  let lastError: unknown = null;

  for (
    let attempt = 1;
    attempt <= RSS_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      const response =
        await fetch(
          WEEKLY_RSS_URL,
          {
            headers: {
              Accept:
                "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
              "User-Agent":
                "Family-Dashboard/1.0",
            },
            cache:
              "no-store",
          }
        );

      if (!response.ok) {
        const error =
          new Error(
            `Smithsonian Weekly GeoRSS svarade med ${response.status}`
          );

        if (
          response.status >= 500 &&
          attempt <
            RSS_MAX_ATTEMPTS
        ) {
          lastError = error;

          await wait(
            RSS_RETRY_DELAY_MS *
              attempt
          );

          continue;
        }

        throw error;
      }

      const xml =
        await response.text();

      const volcanoes =
        parseWeeklyRss(xml);

      if (
        volcanoes.length === 0
      ) {
        throw new Error(
          "Smithsonian Weekly GeoRSS innehöll inga tolkbara vulkanposter."
        );
      }

      return volcanoes;
    } catch (error) {
      lastError = error;

      if (
        attempt >=
          RSS_MAX_ATTEMPTS ||
        !isRetryableFetchError(
          error
        )
      ) {
        throw error;
      }

      await wait(
        RSS_RETRY_DELAY_MS *
          attempt
      );
    }
  }

  throw (
    lastError ??
    new Error(
      "Smithsonian Weekly GeoRSS kunde inte hämtas."
    )
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

  if (
    Date.now() <
    failureCooldownUntil
  ) {
    if (cachedPayload) {
      return cachedPayload;
    }

    throw (
      lastFetchError ??
      new Error(
        "Smithsonian Weekly GeoRSS är tillfälligt otillgänglig."
      )
    );
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    try {
      const rssVolcanoes =
        await fetchWeeklyRss();

      const allVolcanoes:
        VolcanoItem[] =
        rssVolcanoes
          .map(
            (
              volcano
            ): VolcanoItem => ({
              ...volcano,
              distanceKm:
                Math.round(
                  getDistanceKm(
                    GOTHENBURG.latitude,
                    GOTHENBURG.longitude,
                    volcano.latitude,
                    volcano.longitude
                  )
                ),
            })
          )
          .sort(
            (a, b) =>
              a.distanceKm -
              b.distanceKm
          );

      const total =
        allVolcanoes.length;

      const volcanoes =
        allVolcanoes.slice(
          0,
          MAX_VOLCANOES
        );

      const payload:
        VolcanoPayload = {
        generatedAt:
          new Date().toISOString(),
        source:
          "Smithsonian / USGS Weekly Volcanic Activity Report",
        sourceUrl:
          WEEKLY_REPORT_URL,
        location:
          "Göteborg",
        latitude:
          GOTHENBURG.latitude,
        longitude:
          GOTHENBURG.longitude,
        maxResults:
          MAX_VOLCANOES,
        total,
        volcanoes,
      };

      cachedPayload =
        payload;
      cachedAt =
        Date.now();

      failureCooldownUntil = 0;
      lastFetchError = null;

      return payload;
    } catch (error) {
      failureCooldownUntil =
        Date.now() +
        FAILURE_COOLDOWN_MS;

      lastFetchError = error;

      throw error;
    }
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
