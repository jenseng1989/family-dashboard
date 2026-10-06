"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock3,
  LogIn,
  LogOut,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";

type SchoolCalendarEvent = {
  id: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  allDay: boolean;
  htmlLink: string | null;
};

type SchoolCalendarResponse = {
  connected: boolean;
  events?: SchoolCalendarEvent[];
  error?: string;
};

function getStockholmDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

function formatSchoolDate(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatWeekday(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    weekday: "short",
  }).format(date);
}

function formatDayMonth(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatSchoolTime(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function eventOccursToday(event: SchoolCalendarEvent, todayKey: string): boolean {
  if (!event.startTime) {
    return false;
  }

  if (event.allDay) {
    const startKey = event.startTime.slice(0, 10);
    const endKey = event.endTime?.slice(0, 10);

    if (!endKey) {
      return startKey === todayKey;
    }

    // Google Calendar använder exklusivt slutdatum för heldagshändelser.
    return startKey <= todayKey && todayKey < endKey;
  }

  const start = new Date(event.startTime);

  if (Number.isNaN(start.getTime())) {
    return false;
  }

  const end = event.endTime ? new Date(event.endTime) : null;

  if (!end || Number.isNaN(end.getTime())) {
    return getStockholmDateKey(start) === todayKey;
  }

  // Händelser som pågår över midnatt ska synas på båda berörda dagarna.
  const endInclusive = new Date(end.getTime() - 1);
  return (
    getStockholmDateKey(start) <= todayKey &&
    todayKey <= getStockholmDateKey(endInclusive)
  );
}


type SchoolEventKind = "activity" | "dropoff" | "pickup";

function classifySchoolEvent(title: string): {
  kind: SchoolEventKind;
  person: string | null;
} {
  const match = title.trim().match(/^(hämtning|lämning)\s*[-–]\s*(.+)$/i);

  if (!match) {
    return { kind: "activity", person: null };
  }

  return {
    kind: match[1].toLocaleLowerCase("sv-SE") === "hämtning"
      ? "pickup"
      : "dropoff",
    person: match[2].trim() || null,
  };
}

export default function SchoolCalendarWidget() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [events, setEvents] = useState<SchoolCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  const loadEvents = async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    }

    try {
      const response = await fetch("/api/google-school-calendar", {
        cache: "no-store",
      });

      const data = (await response.json()) as SchoolCalendarResponse;

      if (!response.ok || !data.connected) {
        throw new Error(
          data.error || "Skolkalendern kunde inte hämtas."
        );
      }

      setEvents(data.events ?? []);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Skolkalendern kunde inte hämtas."
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setNow(new Date());
    void loadEvents();

    const clockInterval = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    const refreshInterval = window.setInterval(() => {
      void loadEvents();
    }, 15 * 60_000);

    return () => {
      window.clearInterval(clockInterval);
      window.clearInterval(refreshInterval);
    };
  }, []);

  const todaysEvents = useMemo(() => {
    if (!now) {
      return [];
    }

    const todayKey = getStockholmDateKey(now);

    return events
      .filter((event) => eventOccursToday(event, todayKey))
      .sort((a, b) => {
        if (a.allDay !== b.allDay) {
          return a.allDay ? -1 : 1;
        }

        const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
        const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;

        return aTime - bTime;
      });
  }, [events, now]);

  const categorizedEvents = useMemo(() => {
    const activities: SchoolCalendarEvent[] = [];
    const dropoffs: Array<SchoolCalendarEvent & { person: string | null }> = [];
    const pickups: Array<SchoolCalendarEvent & { person: string | null }> = [];

    for (const event of todaysEvents) {
      const classification = classifySchoolEvent(event.title);

      if (classification.kind === "dropoff") {
        dropoffs.push({ ...event, person: classification.person });
      } else if (classification.kind === "pickup") {
        pickups.push({ ...event, person: classification.person });
      } else {
        activities.push(event);
      }
    }

    return { activities, dropoffs, pickups };
  }, [todaysEvents]);

  const weekDays = useMemo(() => {
    if (!now) {
      return [];
    }

    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(now, index);
      const dateKey = getStockholmDateKey(date);
      const dayEvents = events
        .filter((event) => eventOccursToday(event, dateKey))
        .sort((a, b) => {
          if (a.allDay !== b.allDay) {
            return a.allDay ? -1 : 1;
          }

          const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
          const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
          return aTime - bTime;
        });

      return { date, dateKey, events: dayEvents };
    });
  }, [events, now]);

  const renderTime = (event: SchoolCalendarEvent) => {
    const startTime = formatSchoolTime(event.startTime);
    const endTime = formatSchoolTime(event.endTime);

    if (event.allDay) {
      return "Hela dagen";
    }

    if (startTime && endTime) {
      return `${startTime}–${endTime}`;
    }

    return startTime || "Tid saknas";
  };

  return (
    <section
      className={`w-full min-w-0 rounded-3xl border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/10 backdrop-blur-xl ${
        isCollapsed ? "p-3 sm:p-3" : "p-5 sm:p-6"
      }`}
    >
      <div className={`flex gap-3 ${isCollapsed ? "items-center" : "items-start"}`}>
        <div
          className={`flex shrink-0 items-center justify-center rounded-xl border border-blue-300/15 bg-blue-400/[0.08] text-blue-300 ${
            isCollapsed ? "h-9 w-9" : "h-11 w-11"
          }`}
        >
          <CalendarDays size={21} aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          {isCollapsed ? (
            <h2 className="text-lg font-bold text-white">Skolkalender</h2>
          ) : (
            <>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-blue-300">
                Skolkalender
              </p>
              <h2 className="mt-1 text-lg font-bold text-white">Skola idag</h2>
              <p className="mt-0.5 capitalize text-xs text-slate-400">
                {now ? formatSchoolDate(now) : "Laddar dagens datum…"}
              </p>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!isCollapsed && (
            <button
              type="button"
              onClick={() => void loadEvents(true)}
              disabled={isRefreshing}
              aria-label="Uppdatera skolkalendern"
              title="Uppdatera"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-400 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw
                size={17}
                aria-hidden="true"
                className={isRefreshing ? "animate-spin" : ""}
              />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed((value) => !value)}
            aria-expanded={!isCollapsed}
            aria-label={
              isCollapsed ? "Expandera skolkalendern" : "Minimera skolkalendern"
            }
            title={isCollapsed ? "Expandera" : "Minimera"}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-400 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            {isCollapsed ? (
              <ChevronDown size={18} aria-hidden="true" />
            ) : (
              <ChevronUp size={18} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {isLoading ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-6 text-center">
          <RefreshCw
            size={20}
            aria-hidden="true"
            className="mx-auto animate-spin text-blue-300"
          />
          <p className="mt-3 text-sm text-slate-400">
            Hämtar dagens skolkalender…
          </p>
        </div>
      ) : errorMessage ? (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-300/15 bg-amber-400/[0.06] px-4 py-4">
          <TriangleAlert
            size={19}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-amber-300"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">
              Skolkalendern kunde inte visas
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              {errorMessage}
            </p>
          </div>
        </div>
      ) : todaysEvents.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-blue-300/15 bg-slate-950/20 px-5 py-8 text-center">
          <CalendarDays
            size={25}
            aria-hidden="true"
            className="mx-auto text-blue-300"
          />
          <p className="mt-3 text-sm font-medium text-slate-300">
            Inget inlagt i skolkalendern idag.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {categorizedEvents.dropoffs.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Lämning
              </p>
              <div className="space-y-2">
                {categorizedEvents.dropoffs.map((event) => (
                  <div
                    key={event.id}
                    className="flex min-w-0 items-center gap-3 rounded-2xl border border-emerald-300/10 bg-emerald-400/[0.05] px-4 py-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/[0.08] text-emerald-300">
                      <LogIn size={17} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {event.person || "Lämning"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {renderTime(event)}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {categorizedEvents.activities.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Dagens aktiviteter
              </p>
              <div className="space-y-2">
                {categorizedEvents.activities.map((event) => (
                  <div
                    key={event.id}
                    className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-400/[0.08] text-blue-300">
                      <Clock3 size={17} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {event.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {renderTime(event)}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {categorizedEvents.pickups.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Hämtning
              </p>
              <div className="space-y-2">
                {categorizedEvents.pickups.map((event) => (
                  <div
                    key={event.id}
                    className="flex min-w-0 items-center gap-3 rounded-2xl border border-amber-300/10 bg-amber-400/[0.05] px-4 py-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/[0.08] text-amber-300">
                      <LogOut size={17} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {event.person || "Hämtning"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {renderTime(event)}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!isLoading && !errorMessage && (
        <div className="mt-6 border-t border-white/10 pt-5">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-white">Kommande 7 dagar</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Skolkalendern från idag och en vecka framåt
            </p>
          </div>

          <div className="space-y-2">
            {weekDays.map((day, index) => {
              const visibleEvents = index === 0 ? [] : day.events;

              return (
                <div
                  key={day.dateKey}
                  className="rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-3"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="capitalize text-sm font-semibold text-white">
                      {index === 0 ? "Idag" : formatWeekday(day.date)}
                    </p>
                    <p className="shrink-0 text-xs text-slate-500">
                      {formatDayMonth(day.date)}
                    </p>
                  </div>

                  {index === 0 ? (
                    <p className="mt-1.5 text-xs text-slate-400">
                      Visas i översikten ovan
                    </p>
                  ) : visibleEvents.length === 0 ? (
                    <p className="mt-1.5 text-xs text-slate-500">
                      Inget inlagt
                    </p>
                  ) : (
                    <div className="mt-2 space-y-1.5">
                      {visibleEvents.map((event) => {
                        const classification = classifySchoolEvent(event.title);
                        const label =
                          classification.kind === "pickup"
                            ? `Hämtning · ${classification.person || "Ej angivet"}`
                            : classification.kind === "dropoff"
                              ? `Lämning · ${classification.person || "Ej angivet"}`
                              : event.title;

                        return (
                          <div
                            key={event.id}
                            className="flex min-w-0 items-center gap-2 text-xs"
                          >
                            <span className="w-11 shrink-0 text-slate-500">
                              {event.allDay
                                ? "Heldag"
                                : formatSchoolTime(event.startTime) || "–"}
                            </span>
                            <span className="truncate font-medium text-slate-300">
                              {label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
        </>
      )}
    </section>
  );
}
