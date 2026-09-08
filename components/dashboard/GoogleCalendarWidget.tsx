"use client";

import {
  CalendarDays,
  Clock3,
  ExternalLink,
  MapPin,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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

type EventGroup = {
  key: string;
  label: string;
  events: GoogleCalendarEvent[];
};

const STOCKHOLM_TIME_ZONE = "Europe/Stockholm";

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: STOCKHOLM_TIME_ZONE,
  }).format(new Date(dateString));
}

function formatTime(dateString: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: STOCKHOLM_TIME_ZONE,
  }).format(new Date(dateString));
}

function formatLongDate(dateString: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: STOCKHOLM_TIME_ZONE,
  }).format(new Date(dateString));
}

function dateKey(dateString: string) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: STOCKHOLM_TIME_ZONE,
  }).formatToParts(new Date(dateString));

  const year =
    parts.find((part) => part.type === "year")?.value ?? "";
  const month =
    parts.find((part) => part.type === "month")?.value ?? "";
  const day =
    parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

function todayKey() {
  return dateKey(new Date().toISOString());
}

function tomorrowKey() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return dateKey(tomorrow.toISOString());
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

function groupLabel(
  key: string,
  firstEvent: GoogleCalendarEvent
) {
  if (key === todayKey()) {
    return "Idag";
  }

  if (key === tomorrowKey()) {
    return "Imorgon";
  }

  if (firstEvent.startTime) {
    const formatted = formatLongDate(firstEvent.startTime);
    return (
      formatted.charAt(0).toUpperCase() +
      formatted.slice(1)
    );
  }

  return "Kommande";
}

function getDaysUntil(dateString: string): number {
  const targetKey = dateKey(dateString);
  const currentKey = todayKey();

  const target = new Date(`${targetKey}T12:00:00`);
  const current = new Date(`${currentKey}T12:00:00`);

  return Math.round(
    (target.getTime() - current.getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

function getNextEventMessage(
  event: GoogleCalendarEvent | undefined
): string {
  if (!event || !event.startTime) {
    return "Inga fler planerade händelser.";
  }

  const key = dateKey(event.startTime);

  if (key === todayKey()) {
    if (event.allDay) {
      return `${event.title} pågår hela dagen.`;
    }

    return `${event.title} är nästa punkt idag, ${eventTime(
      event
    )}.`;
  }

  if (key === tomorrowKey()) {
    return `${event.title} är nästa händelse, imorgon${
      event.allDay ? " hela dagen" : ` ${eventTime(event)}`
    }.`;
  }

  const days = getDaysUntil(event.startTime);

  if (days > 1) {
    return `${event.title} är nästa händelse om ${days} dagar.`;
  }

  return `${event.title} är nästa händelse.`;
}

export default function GoogleCalendarWidget() {
  const [events, setEvents] = useState<
    GoogleCalendarEvent[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] =
    useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/google-calendar",
        {
          cache: "no-store",
        }
      );

      const data =
        (await response.json()) as GoogleCalendarResponse;

      if (!response.ok || !data.connected) {
        throw new Error(
          data.error ||
            "Google Kalender kunde inte hämtas."
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

  const groups = useMemo<EventGroup[]>(() => {
    const grouped = new Map<
      string,
      GoogleCalendarEvent[]
    >();

    for (const event of events) {
      if (!event.startTime) {
        continue;
      }

      const key = dateKey(event.startTime);
      const existing = grouped.get(key) ?? [];
      existing.push(event);
      grouped.set(key, existing);
    }

    return Array.from(grouped.entries()).map(
      ([key, groupedEvents]) => ({
        key,
        label: groupLabel(key, groupedEvents[0]),
        events: groupedEvents,
      })
    );
  }, [events]);

  const todayEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          event.startTime &&
          dateKey(event.startTime) === todayKey()
      ),
    [events]
  );

  const nextEvent = events[0];

  return (
    <Card
      title="Google Kalender"
      icon={<CalendarDays size={28} />}
    >
      {loading ? (
        <div className="flex min-h-28 items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <RefreshCw
              size={16}
              className="animate-spin"
            />
            Hämtar kalender…
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4">
          <p className="font-medium text-rose-200">
            Kunde inte hämta Google Kalender
          </p>

          <p className="mt-1 text-sm text-rose-300/80">
            {error}
          </p>

          <button
            type="button"
            onClick={() => void loadEvents()}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-300/20 bg-white/[0.04] px-3 py-2 text-sm font-medium text-rose-200 transition hover:bg-white/[0.08]"
          >
            <RefreshCw size={15} />
            Försök igen
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="font-semibold text-white">
            Inga kommande händelser
          </p>

          <p className="mt-2 text-sm text-slate-400">
            Den valda Google-kalendern har inga
            kommande händelser.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-3xl border border-violet-300/20 bg-gradient-to-br from-violet-500/[0.14] via-blue-500/[0.07] to-slate-950/20 p-5">
            <div className="flex items-center gap-2 text-violet-200">
              <Sparkles size={17} />

              <p className="text-xs font-semibold uppercase tracking-[0.16em]">
                Nästa i kalendern
              </p>
            </div>

            <p className="mt-3 text-xl font-bold text-white">
              {nextEvent.title}
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              {getNextEventMessage(nextEvent)}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {nextEvent.startTime && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-200">
                  <CalendarDays size={13} />
                  {formatDate(nextEvent.startTime)}
                </span>
              )}

              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-200">
                <Clock3 size={13} />
                {eventTime(nextEvent)}
              </span>

              {nextEvent.location && (
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-300">
                  <MapPin
                    size={13}
                    className="shrink-0"
                  />
                  <span className="truncate">
                    {nextEvent.location}
                  </span>
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Kvar idag
              </p>

              <p className="mt-1 text-xl font-bold text-white">
                {todayEvents.length}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Kommande
              </p>

              <p className="mt-1 text-xl font-bold text-white">
                {events.length}
              </p>
            </div>
          </div>

          <div className="mt-5 max-h-[38rem] space-y-5 overflow-y-auto pr-1">
            {groups.map((group) => (
              <section key={group.key}>
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-violet-300" />

                  <h3 className="text-sm font-bold text-white">
                    {group.label}
                  </h3>

                  <span className="text-xs text-slate-500">
                    {group.events.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {group.events.map((event) => (
                    <article
                      key={event.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.05] p-3.5 shadow-sm shadow-black/10 transition hover:bg-white/[0.08]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-white">
                            {event.title}
                          </p>

                          {event.location && (
                            <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-400">
                              <MapPin
                                size={13}
                                className="mt-0.5 shrink-0"
                              />
                              <span>
                                {event.location}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={[
                              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold",
                              event.allDay
                                ? "border-violet-300/20 bg-violet-400/10 text-violet-200"
                                : "border-white/10 bg-white/[0.05] text-slate-300",
                            ].join(" ")}
                          >
                            <Clock3 size={13} />
                            {eventTime(event)}
                          </span>

                          {event.htmlLink && (
                            <a
                              href={event.htmlLink}
                              target="_blank"
                              rel="noreferrer"
                              title="Öppna i Google Kalender"
                              aria-label={`Öppna ${event.title} i Google Kalender`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-slate-400 transition hover:bg-white/10 hover:text-white"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
