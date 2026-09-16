"use client";

// Delad klientcache för de kalenderkomponenter som importerar modulen.
// En kort livslängd minskar dubbla anrop vid montering och flikbyte.
export type GoogleCalendarEvent = {
  id: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  allDay: boolean;
  htmlLink: string | null;
};

export type GoogleCalendarData = {
  connected: boolean;
  events: GoogleCalendarEvent[];
  error?: string;
};

const CACHE_DURATION_MS = 30_000;
let cached: { data: GoogleCalendarData; expiresAt: number } | null = null;
let pending: Promise<GoogleCalendarData> | null = null;

export function getGoogleCalendarData(
  options: { forceRefresh?: boolean } = {}
): Promise<GoogleCalendarData> {
  if (!options.forceRefresh && cached && Date.now() < cached.expiresAt) {
    return Promise.resolve(cached.data);
  }

  // Dela även pågående anrop vid ommontering och mellan komponenter.
  if (pending) return pending;

  const request = (async (): Promise<GoogleCalendarData> => {
    const response = await fetch("/api/google-calendar", {
      cache: "no-store",
    });
    const data = (await response.json()) as GoogleCalendarData;

    if (!response.ok || data.connected !== true || !Array.isArray(data.events)) {
      throw new Error(data.error || `Google Kalender svarade ${response.status}.`);
    }

    cached = { data, expiresAt: Date.now() + CACHE_DURATION_MS };
    return data;
  })();

  pending = request;
  void request.finally(() => {
    if (pending === request) pending = null;
  }).catch(() => {
    // Den ursprungliga anroparen hanterar felet.
  });
  return request;
}
