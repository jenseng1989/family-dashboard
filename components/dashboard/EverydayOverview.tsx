"use client";

import {
  CalendarDays,
  CloudSun,
  Clock3,
  Home,
  MapPin,
  RefreshCw,
  TriangleAlert,
  Zap,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ElectricityData,
  ElectricityPrice,
  formatHour,
  formatPrice,
} from "@/lib/electricity";
import {
  createUpcomingFamilyEvents,
  type FamilyEvent,
} from "@/lib/family";
import { getFamilyMembersFromDatabase } from "@/lib/family-db";
import { supabase } from "@/lib/supabase";

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


type CountdownRow = {
  id: string;
  title: string;
  event_date: string;
  created_at: string;
};

type EverydayWeather = {
  location: string;
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  description: string;
  temperatureMax: number;
  temperatureMin: number;
  precipitationSum: number;
  precipitationProbability: number;
  windSpeed: number;
  uvIndex: number;
  outdoor: {
    start: string;
    end: string;
    reason: string;
    score: number;
  } | null;
  updatedAt: string;
};

type ElectricityPeriod = {
  startTime: string;
  endTime: string;
  averagePrice: number;
};

const STOCKHOLM_TIME_ZONE = "Europe/Stockholm";


function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getDaysUntil(value: string): number {
  const today = parseLocalDate(getTodayDateString());
  const date = parseLocalDate(value);

  return Math.round(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
      86_400_000
  );
}

function getDaysLabel(days: number): string {
  if (days === 0) return "Idag";
  if (days === 1) return "Imorgon";
  return `Om ${days} dagar`;
}

function getStockholmDateKey(dateString: string): string {
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

function addDaysToDateKey(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function isMidnightInStockholm(dateString: string): boolean {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone: STOCKHOLM_TIME_ZONE,
  }).formatToParts(new Date(dateString));

  return (
    parts.find((part) => part.type === "hour")?.value === "00" &&
    parts.find((part) => part.type === "minute")?.value === "00" &&
    parts.find((part) => part.type === "second")?.value === "00"
  );
}

function getEventDateRange(event: GoogleCalendarEvent): {
  startKey: string;
  endKey: string;
  totalDays: number;
} | null {
  if (!event.startTime) return null;

  const startKey = getStockholmDateKey(event.startTime);
  let endKey = event.endTime
    ? getStockholmDateKey(event.endTime)
    : startKey;

  if (event.endTime && event.allDay) {
    endKey = addDaysToDateKey(endKey, -1);
  } else if (
    event.endTime &&
    endKey > startKey &&
    isMidnightInStockholm(event.endTime)
  ) {
    endKey = addDaysToDateKey(endKey, -1);
  }

  if (endKey < startKey) {
    endKey = startKey;
  }

  const start = new Date(`${startKey}T12:00:00Z`);
  const end = new Date(`${endKey}T12:00:00Z`);
  const totalDays =
    Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;

  return { startKey, endKey, totalDays };
}

function eventOccursOnDate(
  event: GoogleCalendarEvent,
  key: string
): boolean {
  const range = getEventDateRange(event);
  return Boolean(range && key >= range.startKey && key <= range.endKey);
}

function isCalendarEventActiveNow(
  event: GoogleCalendarEvent,
  now: Date
): boolean {
  const today = getStockholmDateKey(now.toISOString());

  if (!eventOccursOnDate(event, today)) {
    return false;
  }

  if (event.allDay) {
    return true;
  }

  if (!event.startTime) {
    return false;
  }

  const start = new Date(event.startTime).getTime();
  const end = event.endTime
    ? new Date(event.endTime).getTime()
    : Number.POSITIVE_INFINITY;

  return start <= now.getTime() && end > now.getTime();
}

function formatShortCalendarDateKey(key: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    timeZone: STOCKHOLM_TIME_ZONE,
  }).format(new Date(`${key}T12:00:00Z`));
}

function getCalendarEventRangeLabel(
  event: GoogleCalendarEvent,
  today: string
): string | null {
  const range = getEventDateRange(event);

  if (!range || range.totalDays <= 1) {
    return null;
  }

  if (today < range.startKey) {
    return `${formatShortCalendarDateKey(
      range.startKey
    )}–${formatShortCalendarDateKey(range.endKey)} · ${range.totalDays} dagar`;
  }

  const start = new Date(`${range.startKey}T12:00:00Z`);
  const current = new Date(`${today}T12:00:00Z`);
  const dayNumber =
    Math.round((current.getTime() - start.getTime()) / 86_400_000) + 1;

  if (today === range.startKey) {
    if (!event.allDay && event.startTime && event.endTime) {
      return `Startar idag ${formatCalendarTime(
        event.startTime
      )} · ${range.totalDays} dagar · till ${formatShortCalendarDateKey(
        range.endKey
      )} ${formatCalendarTime(event.endTime)}.`;
    }

    return `Startar idag · ${range.totalDays} dagar · till ${formatShortCalendarDateKey(
      range.endKey
    )}.`;
  }

  if (today >= range.startKey && today <= range.endKey) {
    if (!event.allDay && event.endTime) {
      return `Pågår · dag ${dayNumber} av ${range.totalDays} · till ${formatShortCalendarDateKey(
        range.endKey
      )} ${formatCalendarTime(event.endTime)}.`;
    }

    return `Pågår · dag ${dayNumber} av ${range.totalDays} · till ${formatShortCalendarDateKey(
      range.endKey
    )}.`;
  }

  return `${formatShortCalendarDateKey(
    range.startKey
  )}–${formatShortCalendarDateKey(range.endKey)} · ${range.totalDays} dagar`;
}

function formatCalendarTime(dateString: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: STOCKHOLM_TIME_ZONE,
  }).format(new Date(dateString));
}

function formatCalendarDate(dateString: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: STOCKHOLM_TIME_ZONE,
  }).format(new Date(dateString));
}

function getGreeting(hour: number): string {
  if (hour < 10) return "God morgon";
  if (hour < 17) return "God dag";
  return "God kväll";
}

function getDayPhase(hour: number) {
  if (hour < 10) {
    return {
      message: "En ny dag har börjat – här är läget just nu.",
      accent: "text-amber-200",
      glow: "bg-amber-300/[0.08]",
      recommendationTitle: "Bra start på dagen",
    };
  }

  if (hour < 17) {
    return {
      message: "Här är det viktigaste för resten av dagen.",
      accent: "text-blue-200",
      glow: "bg-blue-400/10",
      recommendationTitle: "Smart för resten av dagen",
    };
  }

  return {
    message: "Dagen börjar gå mot sitt slut – här är kvällens läge.",
    accent: "text-violet-200",
    glow: "bg-violet-400/[0.10]",
    recommendationTitle: "Bra att veta ikväll",
  };
}

function getRelativeTime(event: GoogleCalendarEvent, now: Date): string {
  if (event.allDay) return "Hela dagen";

  if (!event.startTime) return "";

  const diffMs = new Date(event.startTime).getTime() - now.getTime();

  if (diffMs <= 0) return "Pågår nu";

  const totalMinutes = Math.max(1, Math.round(diffMs / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `Om ${minutes} min`;
  if (minutes === 0) return `Om ${hours} h`;

  return `Om ${hours} h ${minutes} min`;
}

function getEventTime(event: GoogleCalendarEvent): string {
  if (event.allDay) return "Hela dagen";
  if (!event.startTime) return "";

  const start = formatCalendarTime(event.startTime);

  if (!event.endTime) return start;

  return `${start}–${formatCalendarTime(event.endTime)}`;
}

function findCheapestPeriod(
  prices: ElectricityPrice[],
  entries: number
): ElectricityPeriod | null {
  if (prices.length < entries || entries < 1) return null;

  let cheapest: ElectricityPeriod | null = null;

  for (let index = 0; index <= prices.length - entries; index += 1) {
    const period = prices.slice(index, index + entries);
    const averagePrice =
      period.reduce((sum, price) => sum + price.SEK_per_kWh, 0) /
      period.length;

    if (!cheapest || averagePrice < cheapest.averagePrice) {
      cheapest = {
        startTime: period[0].time_start,
        endTime: period[period.length - 1].time_end,
        averagePrice,
      };
    }
  }

  return cheapest;
}

function getElectricityAdvice(
  electricity: ElectricityData | null,
  now: Date | null
): {
  title: string;
  description: string;
} {
  if (!electricity || !now) {
    return {
      title: "Ingen prisdata",
      description: "Elpriset kunde inte hämtas just nu.",
    };
  }

  const remaining = electricity.prices.filter(
    (price) => new Date(price.time_end).getTime() > now.getTime()
  );

  const threeHourPeriod = findCheapestPeriod(remaining, 3);
  const oneHourPeriod = findCheapestPeriod(remaining, 1);
  const period = threeHourPeriod ?? oneHourPeriod;

  if (!period) {
    return {
      title: "Dagens priser är snart slut",
      description: `Dagens snitt är ${formatPrice(
        electricity.averagePrice
      )} kr/kWh.`,
    };
  }

  const durationLabel = threeHourPeriod ? "3 timmar" : "timmen";

  return {
    title: `${formatHour(period.startTime)}–${formatHour(period.endTime)}`,
    description: `Bästa ${durationLabel} som återstår · cirka ${formatPrice(
      period.averagePrice
    )} kr/kWh.`,
  };
}

export default function EverydayOverview() {
  const [now, setNow] = useState<Date | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<
    GoogleCalendarEvent[]
  >([]);
  const [countdowns, setCountdowns] = useState<CountdownRow[]>([]);
  const [familyEvents, setFamilyEvents] = useState<FamilyEvent[]>([]);
  const [weather, setWeather] = useState<EverydayWeather | null>(null);
  const [electricity, setElectricity] =
    useState<ElectricityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPartialError, setHasPartialError] = useState(false);

  const loadData = useCallback(
    async (showLoader = true, forceRefresh = false) => {
      if (showLoader) setIsLoading(true);
      setHasPartialError(false);

      try {
        const [
          calendarResponse,
          countdownResult,
          familyMembers,
          weatherResponse,
          electricityResponse,
        ] = await Promise.all([
          fetch("/api/google-calendar", {
            cache: "no-store",
          }),
          supabase
            .from("countdowns")
            .select("id, title, event_date, created_at")
            .gte("event_date", getTodayDateString())
            .order("event_date", { ascending: true })
            .order("created_at", { ascending: true }),
          getFamilyMembersFromDatabase(),
          fetch(
            "/api/everyday-weather",
            forceRefresh ? { cache: "reload" } : undefined
          ),
          fetch(
            "/api/electricity",
            forceRefresh ? { cache: "reload" } : undefined
          ),
        ]);

        if (calendarResponse.ok) {
          const calendarData =
            (await calendarResponse.json()) as GoogleCalendarResponse;

          if (calendarData.connected === true) {
            setCalendarEvents(calendarData.events ?? []);
          } else {
            console.error(
              "Idag: Google Kalender är inte ansluten:",
              calendarData.error
            );
            setCalendarEvents([]);
            setHasPartialError(true);
          }
        } else {
          console.error("Idag: kunde inte hämta Google Kalender.");
          setCalendarEvents([]);
          setHasPartialError(true);
        }

        if (countdownResult.error) {
          console.error(
            "Idag: kunde inte hämta nedräkningar:",
            countdownResult.error
          );
          setCountdowns([]);
          setHasPartialError(true);
        } else {
          setCountdowns((countdownResult.data ?? []) as CountdownRow[]);
        }

        setFamilyEvents(createUpcomingFamilyEvents(familyMembers));

        if (weatherResponse.ok) {
          setWeather(
            (await weatherResponse.json()) as EverydayWeather
          );
        } else {
          setWeather(null);
          setHasPartialError(true);
        }

        if (electricityResponse.ok) {
          const electricityData =
            (await electricityResponse.json()) as ElectricityData;

          if (Array.isArray(electricityData.prices)) {
            setElectricity(electricityData);
          } else {
            setElectricity(null);
            setHasPartialError(true);
          }
        } else {
          setElectricity(null);
          setHasPartialError(true);
        }
      } catch (error) {
        console.error("Idag kunde inte hämta dagens data:", error);
        setHasPartialError(true);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadData();

    const refreshId = window.setInterval(() => {
      void loadData(false);
    }, 15 * 60 * 1000);

    return () => window.clearInterval(refreshId);
  }, [loadData]);

  useEffect(() => {
    setNow(new Date());

    const clockId = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(clockId);
  }, []);

  const nextFamilyEvent = useMemo(
    () =>
      familyEvents.find((event) => event.daysUntil >= 0) ?? null,
    [familyEvents]
  );

  const nextCountdown = countdowns[0] ?? null;

  const todaysCalendarEvents = useMemo(() => {
    if (!now) return [];

    const today = getStockholmDateKey(now.toISOString());

    return calendarEvents.filter((event) =>
      eventOccursOnDate(event, today)
    );
  }, [calendarEvents, now]);

  const activeCalendarEvents = useMemo(() => {
    if (!now) return [];

    return todaysCalendarEvents.filter((event) =>
      isCalendarEventActiveNow(event, now)
    );
  }, [todaysCalendarEvents, now]);

  const nextCalendarEvent = useMemo(() => {
    if (!now) return null;

    return (
      todaysCalendarEvents.find((event) => {
        if (isCalendarEventActiveNow(event, now)) return false;
        if (event.allDay) return false;
        if (!event.startTime) return false;

        return new Date(event.startTime).getTime() > now.getTime();
      }) ?? null
    );
  }, [todaysCalendarEvents, now]);

  const nextUpcomingEvent = useMemo(() => {
    if (!now) return null;

    const today = getStockholmDateKey(now.toISOString());

    return (
      calendarEvents.find((event) => {
        const range = getEventDateRange(event);
        if (!range) return false;

        if (range.endKey < today) return false;

        if (eventOccursOnDate(event, today)) {
          if (isCalendarEventActiveNow(event, now)) return false;
          if (!event.startTime) return false;
          return new Date(event.startTime).getTime() > now.getTime();
        }

        return range.startKey > today;
      }) ?? null
    );
  }, [calendarEvents, now]);

  const calendarHeroEvents = useMemo(() => {
    if (activeCalendarEvents.length > 0) {
      return activeCalendarEvents;
    }

    const next = nextCalendarEvent ?? nextUpcomingEvent;
    return next ? [next] : [];
  }, [activeCalendarEvents, nextCalendarEvent, nextUpcomingEvent]);

  const calendarTodayKey = now
    ? getStockholmDateKey(now.toISOString())
    : "";

  const calendarHeroIds = useMemo(
    () => new Set(calendarHeroEvents.map((event) => event.id)),
    [calendarHeroEvents]
  );

  const remainingTodayEvents = useMemo(() => {
    if (!now) return [];

    return todaysCalendarEvents.filter((event) => {
      if (calendarHeroIds.has(event.id)) return false;
      if (event.allDay) return true;
      if (!event.endTime) return true;

      return new Date(event.endTime).getTime() > now.getTime();
    });
  }, [calendarHeroIds, now, todaysCalendarEvents]);

  const electricityAdvice = useMemo(
    () => getElectricityAdvice(electricity, now),
    [electricity, now]
  );

  const dayPhase = now ? getDayPhase(now.getHours()) : null;

  const weatherSummary = weather
    ? `${Math.round(weather.temperature)}° · ${weather.description}`
    : "Väder saknas";

  const electricitySummary =
    electricity?.currentPrice
      ? `${formatPrice(
          electricity.currentPrice.SEK_per_kWh
        )} kr/kWh`
      : "Pris saknas";

  return (
    <div className="grid w-full min-w-0 grid-cols-12 gap-5">
      <section className="relative col-span-12 overflow-hidden rounded-[2rem] border border-blue-300/15 bg-gradient-to-br from-slate-950 via-blue-950/35 to-violet-950/25 p-5 shadow-2xl shadow-blue-950/20 sm:p-6 lg:p-7">
        <div
          className={[
            "pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full blur-3xl transition-colors duration-700",
            dayPhase?.glow ?? "bg-blue-400/10",
          ].join(" ")}
        />
        <div className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-violet-400/[0.08] blur-3xl" />

        <div className="relative">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-blue-300">
                <Home size={18} />
                <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                  Idag
                </p>
              </div>

              <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
                {now ? getGreeting(now.getHours()) : "Hej"} 👋
              </h2>

              {dayPhase && (
                <p
                  className={[
                    "mt-2 text-sm font-medium sm:text-base",
                    dayPhase.accent,
                  ].join(" ")}
                >
                  {dayPhase.message}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
                <span className="flex items-center gap-2 capitalize">
                  <CalendarDays size={16} />
                  {now
                    ? now.toLocaleDateString("sv-SE", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })
                    : "Laddar datum…"}
                </span>

                <span className="flex items-center gap-2">
                  <Clock3 size={16} />
                  {now
                    ? now.toLocaleTimeString("sv-SE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "--:--"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-sky-300/15 bg-sky-400/[0.08] px-3 py-1.5 text-xs font-semibold text-sky-100">
                  🌤 {weatherSummary}
                </span>

                <span className="rounded-full border border-amber-300/15 bg-amber-400/[0.08] px-3 py-1.5 text-xs font-semibold text-amber-100">
                  ⚡ {electricitySummary}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadData(true, true)}
              disabled={isLoading}
              className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-300/15 bg-blue-400/10 px-4 py-2.5 text-sm font-semibold text-blue-100 transition hover:bg-blue-400/20 disabled:opacity-50 sm:w-auto"
            >
              <RefreshCw
                size={16}
                className={isLoading ? "animate-spin" : ""}
              />
              Uppdatera
            </button>
          </div>

          {hasPartialError && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-300/15 bg-amber-400/[0.06] p-4">
              <TriangleAlert
                size={18}
                className="mt-0.5 shrink-0 text-amber-300"
              />
              <p className="text-sm text-amber-100/80">
                Någon del av dagens information kunde inte hämtas, men
                övriga delar visas som vanligt.
              </p>
            </div>
          )}

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-fuchsia-300/10 bg-fuchsia-400/[0.05] px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fuchsia-300">
                  Nästa familjehändelse
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-200">
                  {nextFamilyEvent?.title ?? "Ingen kommande händelse"}
                </p>
              </div>
              {nextFamilyEvent && (
                <span className="shrink-0 text-sm font-bold text-white">
                  {getDaysLabel(nextFamilyEvent.daysUntil)}
                </span>
              )}
            </div>

            <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.05] px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-300">
                  Nästa nedräkning
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-200">
                  {nextCountdown?.title ?? "Ingen aktiv nedräkning"}
                </p>
              </div>
              {nextCountdown && (
                <span className="shrink-0 text-sm font-bold text-white">
                  {getDaysLabel(getDaysUntil(nextCountdown.event_date))}
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-3xl border border-violet-300/15 bg-gradient-to-br from-violet-400/[0.10] via-blue-400/[0.05] to-transparent p-4 sm:p-5">
              <div className="flex items-center gap-2 text-violet-200">
                <CalendarDays size={17} />
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">
                  Nästa på tur
                </p>
              </div>

              {calendarHeroEvents.length > 0 ? (
                <>
                  <div className="mt-4 space-y-4">
                    {calendarHeroEvents.map((event, index) => {
                      const isToday = Boolean(
                        calendarTodayKey &&
                          eventOccursOnDate(event, calendarTodayKey)
                      );
                      const rangeLabel = calendarTodayKey
                        ? getCalendarEventRangeLabel(
                            event,
                            calendarTodayKey
                          )
                        : null;

                      return (
                        <div
                          key={event.id}
                          className={
                            index > 0
                              ? "border-t border-white/10 pt-4"
                              : undefined
                          }
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-xl font-bold text-white">
                                {event.title}
                              </p>

                              {!rangeLabel && (
                                <p className="mt-1 text-sm text-slate-400">
                                  {isToday
                                    ? getEventTime(event)
                                    : event.startTime
                                      ? `${formatCalendarDate(
                                          event.startTime
                                        )} · ${getEventTime(event)}`
                                      : getEventTime(event)}
                                </p>
                              )}

                              {rangeLabel && (
                                <p className="mt-2 text-sm font-semibold text-violet-200">
                                  {rangeLabel}
                                </p>
                              )}

                              {event.location && (
                                <p className="mt-3 flex items-start gap-2 text-sm text-slate-400">
                                  <MapPin
                                    size={15}
                                    className="mt-0.5 shrink-0"
                                  />
                                  <span>{event.location}</span>
                                </p>
                              )}
                            </div>

                            {isToday && now && (
                              <span className="w-fit shrink-0 rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1.5 text-xs font-bold text-violet-100">
                                {getRelativeTime(event, now)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {remainingTodayEvents.length > 0 && (
                    <p className="mt-4 border-t border-white/10 pt-3 text-xs text-slate-500">
                      {remainingTodayEvents.length} ytterligare{" "}
                      {remainingTodayEvents.length === 1
                        ? "händelse"
                        : "händelser"}{" "}
                      kvar i dagens kalender.
                    </p>
                  )}
                </>
              ) : (
                <div className="mt-4">
                  <p className="text-lg font-bold text-white">
                    Klart för idag
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Inga fler kalenderhändelser är planerade.
                  </p>
                </div>
              )}
            </article>

            <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {dayPhase?.recommendationTitle ?? "Dagens läge"}
              </p>

              <div className="mt-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-300/15 bg-emerald-400/[0.08] text-lg">
                    🌿
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.13em] text-emerald-300">
                      Bäst ute
                    </p>

                    {weather?.outdoor ? (
                      <>
                        <p className="mt-1 font-bold text-white">
                          {weather.outdoor.start}–{weather.outdoor.end}
                        </p>
                        <p className="mt-1 text-sm leading-5 text-slate-400">
                          {weather.outdoor.reason}
                        </p>
                      </>
                    ) : (
                      <p className="mt-1 text-sm text-slate-400">
                        Ingen lämplig utetid återstår att bedöma idag.
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-300/15 bg-amber-400/[0.08] text-amber-300">
                      <Zap size={18} />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.13em] text-amber-300">
                        Smart elanvändning
                      </p>
                      <p className="mt-1 font-bold text-white">
                        {electricityAdvice.title}
                      </p>
                      <p className="mt-1 text-sm leading-5 text-slate-400">
                        {electricityAdvice.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>

          {weather && (
            <article className="mt-4 rounded-3xl border border-sky-300/15 bg-gradient-to-br from-sky-400/[0.08] via-blue-400/[0.04] to-transparent p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-300/15 bg-sky-400/10 text-sky-300">
                    <CloudSun size={23} />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">
                      Vädret idag
                    </p>
                    <div className="mt-1 flex flex-wrap items-baseline gap-2">
                      <p className="text-2xl font-black text-white">
                        {Math.round(weather.temperature)}°
                      </p>
                      <p className="font-semibold text-slate-200">
                        {weather.description}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      {weather.location} · Högst{" "}
                      {Math.round(weather.temperatureMax)}° · Lägst{" "}
                      {Math.round(weather.temperatureMin)}° · Känns som{" "}
                      {Math.round(weather.apparentTemperature)}°
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:min-w-[20rem]">
                  <div className="rounded-xl border border-white/10 bg-slate-950/20 px-3 py-2.5">
                    <p className="text-[11px] text-slate-500">🌧 Regn</p>
                    <p className="mt-1 text-sm font-bold text-white">
                      {Math.round(weather.precipitationProbability)}%
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-slate-950/20 px-3 py-2.5">
                    <p className="text-[11px] text-slate-500">🌬 Vind</p>
                    <p className="mt-1 text-sm font-bold text-white">
                      {Math.round(weather.windSpeed)} m/s
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-slate-950/20 px-3 py-2.5">
                    <p className="text-[11px] text-slate-500">☀️ UV</p>
                    <p className="mt-1 text-sm font-bold text-white">
                      {Math.round(weather.uvIndex)}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          )}
        </div>
      </section>
    </div>
  );
}
