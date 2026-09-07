"use client";

import { CalendarDays, Clock3, MapPin, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Card from "@/components/ui/Card";

type GoogleCalendarEvent = {
  id: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  allDay: boolean;
  htmlLink: string | null;
};

type GoogleCalendarResponse = {
  connected?: boolean;
  events?: GoogleCalendarEvent[];
  error?: string;
};

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Stockholm",
  }).format(new Date(dateString));
}

function formatTime(dateString: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Stockholm",
  }).format(new Date(dateString));
}

function eventTime(event: GoogleCalendarEvent) {
  if (event.allDay) {
    return "Hela dagen";
  }

  if (!event.startTime) {
    return "";
  }

  const start = formatTime(event.startTime);

  if (!event.endTime) {
    return start;
  }

  return `${start}–${formatTime(event.endTime)}`;
}

export default function GoogleCalendarWidget() {
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/google-calendar", {
        cache: "no-store",
      });

      const data = (await response.json()) as GoogleCalendarResponse;

      if (!response.ok || !data.connected) {
        throw new Error(
          data.error || "Google Kalender kunde inte hämtas."
        );
      }

      setEvents(data.events ?? []);
    } catch (loadError) {
      setEvents([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Google Kalender kunde inte hämtas."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  return (
    <Card title="Google Kalender" icon={<CalendarDays size={28} />}>
      {loading ? (
        <div className="flex min-h-28 items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <RefreshCw size={16} className="animate-spin" />
            Hämtar kalender…
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-950 dark:bg-rose-950/30">
          <p className="font-medium text-rose-700 dark:text-rose-300">
            Kunde inte hämta Google Kalender
          </p>
          <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void loadEvents()}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950"
          >
            <RefreshCw size={15} />
            Försök igen
          </button>
        </div>
      ) : events.length === 0 ? (
        <div>
          <p className="font-medium text-slate-900 dark:text-white">
            Inga kommande händelser
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Den valda Google-kalendern har inga kommande händelser.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-sm shadow-black/10 backdrop-blur-sm transition hover:bg-white/[0.09]"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-white">
                    {event.title}
                  </p>

                  {event.startTime ? (
                    <p className="mt-1 text-sm font-medium text-slate-400">
                      {formatDate(event.startTime)}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-sm font-semibold text-slate-300">
                  <Clock3 size={15} />
                  {eventTime(event)}
                </div>
              </div>

              {event.location ? (
                <div className="mt-3 flex items-start gap-2 border-t border-white/[0.07] pt-3 text-sm text-slate-400">
                  <MapPin size={15} className="mt-0.5 shrink-0" />
                  <span>{event.location}</span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
