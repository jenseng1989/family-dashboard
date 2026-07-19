import { NextResponse } from "next/server";
import {
  getUpcomingFamilyEvents,
  type FamilyEvent,
} from "@/lib/family";

export const dynamic = "force-dynamic";

export type TodayNoticeType =
  | "weather"
  | "birthday"
  | "nameDay"
  | "countdown";

export type WeatherWarningLevel =
  | "yellow"
  | "orange"
  | "red"
  | "unknown";

export type TodayNotice = {
  id: string;
  type: TodayNoticeType;
  title: string;
  description: string;
  severity?: WeatherWarningLevel;
  startsAt?: string;
  endsAt?: string;
};

type TodayStatusResponse = {
  notices: TodayNotice[];
  updatedAt: string;
  partialError?: boolean;
};

type UnknownRecord = Record<string, unknown>;

const SMHI_WARNING_URL =
  "https://opendata-download-warnings.smhi.se/ibww/api/version/1/warning.json";

const RELEVANT_AREA_TERMS = [
  "göteborg",
  "västra götalands län",
  "västra götaland",
];

function isRecord(value: unknown): value is UnknownRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase("sv-SE")
    .replace(/\s+/g, " ")
    .trim();
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectStrings);
  }

  if (isRecord(value)) {
    return Object.values(value).flatMap(
      collectStrings
    );
  }

  return [];
}

function findFirstStringByKeys(
  value: unknown,
  wantedKeys: string[]
): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const result = findFirstStringByKeys(
        item,
        wantedKeys
      );

      if (result) {
        return result;
      }
    }

    return undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const normalizedWantedKeys = wantedKeys.map(
    (key) => key.toLowerCase()
  );

  for (const [key, propertyValue] of Object.entries(
    value
  )) {
    if (
      normalizedWantedKeys.includes(
        key.toLowerCase()
      ) &&
      typeof propertyValue === "string" &&
      propertyValue.trim()
    ) {
      return propertyValue.trim();
    }
  }

  for (const propertyValue of Object.values(value)) {
    const result = findFirstStringByKeys(
      propertyValue,
      wantedKeys
    );

    if (result) {
      return result;
    }
  }

  return undefined;
}

function extractWarningItems(
  data: unknown
): UnknownRecord[] {
  if (Array.isArray(data)) {
    return data.filter(isRecord);
  }

  if (!isRecord(data)) {
    return [];
  }

  const possibleArrayKeys = [
    "warnings",
    "warning",
    "items",
    "alerts",
  ];

  for (const key of possibleArrayKeys) {
    const value = data[key];

    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }
  }

  return [];
}

function isRelevantForGothenburg(
  warning: UnknownRecord
): boolean {
  const warningText = normalizeText(
    collectStrings(warning).join(" ")
  );

  return RELEVANT_AREA_TERMS.some((term) =>
    warningText.includes(term)
  );
}

function normalizeWarningLevel(
  rawLevel: string | undefined
): WeatherWarningLevel {
  if (!rawLevel) {
    return "unknown";
  }

  const normalized = normalizeText(rawLevel);

  if (
    normalized.includes("red") ||
    normalized.includes("röd")
  ) {
    return "red";
  }

  if (
    normalized.includes("orange") ||
    normalized.includes("orange")
  ) {
    return "orange";
  }

  if (
    normalized.includes("yellow") ||
    normalized.includes("gul")
  ) {
    return "yellow";
  }

  return "unknown";
}

function getLevelLabel(
  level: WeatherWarningLevel
): string {
  switch (level) {
    case "red":
      return "Röd varning";

    case "orange":
      return "Orange varning";

    case "yellow":
      return "Gul varning";

    default:
      return "Vädervarning";
  }
}

function cleanDescription(
  description: string | undefined
): string {
  if (!description) {
    return "SMHI har utfärdat en vädervarning som berör Göteborgsområdet.";
  }

  const cleaned = description
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= 220) {
    return cleaned;
  }

  return `${cleaned.slice(0, 217).trim()}…`;
}

function createWeatherNotice(
  warning: UnknownRecord,
  index: number
): TodayNotice {
  const identifier =
    findFirstStringByKeys(warning, [
      "identifier",
      "id",
      "warningId",
    ]) ?? `smhi-warning-${index}`;

  const eventName =
    findFirstStringByKeys(warning, [
      "event",
      "eventName",
      "headline",
      "warningType",
      "eventDescription",
    ]) ?? "Vädervarning";

  const rawLevel = findFirstStringByKeys(
    warning,
    [
      "warningLevel",
      "level",
      "severity",
      "eventLevel",
    ]
  );

  const severity =
    normalizeWarningLevel(rawLevel);

  const area =
    findFirstStringByKeys(warning, [
      "areaName",
      "districtName",
      "area",
      "district",
    ]) ?? "Göteborgsområdet";

  const description = findFirstStringByKeys(
    warning,
    [
      "description",
      "descriptions",
      "consequence",
      "consequences",
      "instruction",
      "text",
    ]
  );

  const startsAt = findFirstStringByKeys(
    warning,
    [
      "start",
      "startsAt",
      "onset",
      "validFrom",
      "effective",
    ]
  );

  const endsAt = findFirstStringByKeys(
    warning,
    [
      "end",
      "endsAt",
      "expires",
      "validTo",
    ]
  );

  return {
    id: `weather-${identifier}`,
    type: "weather",
    severity,
    title: `${getLevelLabel(severity)}: ${eventName}`,
    description: `${area} – ${cleanDescription(
      description
    )}`,
    startsAt,
    endsAt,
  };
}

async function getSmhiWeatherWarnings(): Promise<
  TodayNotice[]
> {
  const response = await fetch(SMHI_WARNING_URL, {
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: 300,
    },
  });

  if (!response.ok) {
    throw new Error(
      `SMHI svarade med status ${response.status}`
    );
  }

  const data: unknown = await response.json();

  return extractWarningItems(data)
    .filter(isRelevantForGothenburg)
    .map(createWeatherNotice)
    .sort((firstNotice, secondNotice) => {
      const priority: Record<
        WeatherWarningLevel,
        number
      > = {
        red: 0,
        orange: 1,
        yellow: 2,
        unknown: 3,
      };

      return (
        priority[
          firstNotice.severity ?? "unknown"
        ] -
        priority[
          secondNotice.severity ?? "unknown"
        ]
      );
    });
}

function createFamilyNotice(
  event: FamilyEvent
): TodayNotice {
  if (event.type === "birthday") {
    return {
      id: event.id,
      type: "birthday",
      title: "Födelsedag idag",
      description: `${event.emoji} ${event.title}!`,
    };
  }

  return {
    id: event.id,
    type: "nameDay",
    title: "Namnsdag idag",
    description: `${event.emoji} ${event.title}!`,
  };
}

export async function GET() {
  const familyNotices = getUpcomingFamilyEvents()
    .filter((event) => event.daysUntil === 0)
    .map(createFamilyNotice);

  let weatherNotices: TodayNotice[] = [];
  let partialError = false;

  try {
    weatherNotices =
      await getSmhiWeatherWarnings();
  } catch (error) {
    partialError = true;

    console.error(
      "Kunde inte hämta varningar från SMHI:",
      error
    );
  }

  const response: TodayStatusResponse = {
    notices: [
      ...weatherNotices,
      ...familyNotices,
    ],
    updatedAt: new Date().toISOString(),
    partialError,
  };

  return NextResponse.json(response);
}