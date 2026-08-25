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
  url?: string;
};

type TodayStatusResponse = {
  notices: TodayNotice[];
  updatedAt: string;
  partialError?: boolean;
};

type UnknownRecord = Record<string, unknown>;

const SMHI_WARNING_URL =
  "https://opendata-download-warnings.smhi.se/ibww/api/version/1/warning.json";

const SMHI_WARNING_PAGE_URL =
  "https://www.smhi.se/vader/varningar-och-meddelanden";

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
    return Object.values(value).flatMap(collectStrings);
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

  const normalizedWantedKeys = wantedKeys.map((key) =>
    key.toLowerCase()
  );

  for (const [key, propertyValue] of Object.entries(value)) {
    if (
      normalizedWantedKeys.includes(key.toLowerCase()) &&
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

function extractWarningItems(data: unknown): UnknownRecord[] {
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

  if (normalized.includes("orange")) {
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

function getWarningSeverity(
  warning: UnknownRecord
): WeatherWarningLevel {
  const rawLevel = findFirstStringByKeys(warning, [
    "warningLevel",
    "level",
    "severity",
    "eventLevel",
  ]);

  return normalizeWarningLevel(rawLevel);
}

function getHighestSeverity(
  warnings: UnknownRecord[]
): WeatherWarningLevel {
  const priority: Record<WeatherWarningLevel, number> = {
    red: 3,
    orange: 2,
    yellow: 1,
    unknown: 0,
  };

  let highest: WeatherWarningLevel = "unknown";

  for (const warning of warnings) {
    const severity = getWarningSeverity(warning);

    if (priority[severity] > priority[highest]) {
      highest = severity;
    }
  }

  return highest;
}

function createCombinedWeatherNotice(
  warnings: UnknownRecord[]
): TodayNotice | null {
  if (warnings.length === 0) {
    return null;
  }

  return {
    id: "weather-gothenburg",
    type: "weather",
    severity: getHighestSeverity(warnings),
    title: "Vädervarning",
    description:
      "Det finns en eller flera vädervarningar i Göteborg.",
    url: SMHI_WARNING_PAGE_URL,
  };
}

async function getSmhiWeatherNotice(): Promise<
  TodayNotice | null
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

  const relevantWarnings = extractWarningItems(data).filter(
    isRelevantForGothenburg
  );

  return createCombinedWeatherNotice(relevantWarnings);
}

function createFamilyNotice(event: FamilyEvent): TodayNotice {
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

  let weatherNotice: TodayNotice | null = null;
  let partialError = false;

  try {
    weatherNotice = await getSmhiWeatherNotice();
  } catch (error) {
    partialError = true;

    console.error(
      "Kunde inte hämta varningar från SMHI:",
      error
    );
  }

  const notices: TodayNotice[] = [
    ...(weatherNotice ? [weatherNotice] : []),
    ...familyNotices,
  ];

  const response: TodayStatusResponse = {
    notices,
    updatedAt: new Date().toISOString(),
    partialError,
  };

  return NextResponse.json(response);
}