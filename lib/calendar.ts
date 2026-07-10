export type CalendarEvent = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
};

type CalendarApiResponse =
  | CalendarEvent[]
  | {
      events?: CalendarEvent[];
      error?: string;
      message?: string;
    };

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  const response = await fetch("http://localhost:3000/api/calendar", {
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as CalendarApiResponse;

  if (Array.isArray(data)) {
    return data;
  }

  return data.events ?? [];
}

export function formatEventTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}