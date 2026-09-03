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
  startsAt?: string | null;
  endsAt?: string | null;
  url?: string;
};

export type TodayStatusApiResponse = {
  notices?: TodayNotice[];
  updatedAt?: string;
  partialError?: boolean;
};

const CACHE_TTL_MS =
  5 * 60 * 1000;

let cachedData:
  TodayStatusApiResponse | null =
  null;

let cachedAt = 0;

let inFlight:
  Promise<TodayStatusApiResponse> | null =
  null;

function isFresh() {
  return (
    cachedData !== null &&
    Date.now() - cachedAt <
      CACHE_TTL_MS
  );
}

async function fetchTodayStatus() {
  const response =
    await fetch(
      "/api/today-status"
    );

  const data =
    (await response.json()) as
      TodayStatusApiResponse & {
        error?: string;
      };

  if (!response.ok) {
    throw new Error(
      data.error ??
        `API-fel ${response.status}`
    );
  }

  cachedData = data;
  cachedAt = Date.now();

  return data;
}

export async function getTodayStatus(
  forceRefresh = false
): Promise<TodayStatusApiResponse> {
  if (
    !forceRefresh &&
    isFresh() &&
    cachedData
  ) {
    return cachedData;
  }

  if (
    !forceRefresh &&
    inFlight
  ) {
    return inFlight;
  }

  inFlight =
    fetchTodayStatus();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export function clearTodayStatusCache() {
  cachedData = null;
  cachedAt = 0;
  inFlight = null;
}
