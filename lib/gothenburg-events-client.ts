export type GothenburgEventItem = {
  id: string;
  title: string;
  subtitle: string | null;
  place: string | null;
  dateText: string | null;
  url: string;
  imageUrl: string | null;
  isFree: boolean;
  isFamily: boolean;
  dates: string[];
};

export type GothenburgEventDay = {
  date: string;
  events: GothenburgEventItem[];
};

export type GothenburgEventsResponse = {
  source: string;
  sourceUrl: string;
  today: {
    date: string;
    events: GothenburgEventItem[];
  };
  todayCount: number;
  upcomingStartDate: string | null;
  upcomingEndDate: string | null;
  upcomingDays: GothenburgEventDay[];
  total: number;
  updatedAt: string;
  error?: string;
};

const CLIENT_CACHE_TTL_MS =
  10 * 60 * 1000;

let cachedData:
  GothenburgEventsResponse | null =
  null;

let cachedAt = 0;

let inFlight:
  Promise<GothenburgEventsResponse> | null =
  null;

function isCacheFresh() {
  return (
    cachedData !== null &&
    Date.now() - cachedAt <
      CLIENT_CACHE_TTL_MS
  );
}

async function fetchEvents() {
  const response = await fetch(
    "/api/gothenburg-events"
  );

  const result =
    (await response.json()) as
      GothenburgEventsResponse;

  if (!response.ok) {
    throw new Error(
      result.error ??
        `API-fel ${response.status}`
    );
  }

  cachedData = result;
  cachedAt = Date.now();

  return result;
}

export async function getGothenburgEvents(
  forceRefresh = false
): Promise<GothenburgEventsResponse> {
  if (
    !forceRefresh &&
    isCacheFresh() &&
    cachedData
  ) {
    return cachedData;
  }

  if (!forceRefresh && inFlight) {
    return inFlight;
  }

  inFlight = fetchEvents();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export function clearGothenburgEventsCache() {
  cachedData = null;
  cachedAt = 0;
  inFlight = null;
}
