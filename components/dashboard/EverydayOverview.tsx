"use client";

import {
  CalendarClock,
  CalendarDays,
  CloudSun,
  Clock3,
  Home,
  LoaderCircle,
  PartyPopper,
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
import { supabase } from "@/lib/supabase";
import {
  ElectricityData,
  formatHour,
  formatPrice,
} from "@/lib/electricity";
import {
  createUpcomingFamilyEvents,
  type FamilyEvent,
} from "@/lib/family";
import {
  getFamilyMembersFromDatabase,
} from "@/lib/family-db";

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

function getStockholmDateKey(
  dateString: string
): string {
  const parts =
    new Intl.DateTimeFormat(
      "sv-SE",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone:
          "Europe/Stockholm",
      }
    ).formatToParts(
      new Date(dateString)
    );

  const year =
    parts.find(
      (part) =>
        part.type === "year"
    )?.value ?? "";

  const month =
    parts.find(
      (part) =>
        part.type === "month"
    )?.value ?? "";

  const day =
    parts.find(
      (part) =>
        part.type === "day"
    )?.value ?? "";

  return `${year}-${month}-${day}`;
}

function formatCalendarTime(
  dateString: string
): string {
  return new Intl.DateTimeFormat(
    "sv-SE",
    {
      hour: "2-digit",
      minute: "2-digit",
      timeZone:
        "Europe/Stockholm",
    }
  ).format(
    new Date(dateString)
  );
}

function getGreeting(
  hour: number
): string {
  if (hour < 10) {
    return "God morgon";
  }

  if (hour < 17) {
    return "God dag";
  }

  return "God kväll";
}

function getDayPhase(hour: number) {
  if (hour < 10) {
    return {
      message: "En ny dag har börjat – här är läget just nu.",
      accent: "text-amber-200",
      glow: "bg-amber-300/[0.08]",
    };
  }

  if (hour < 17) {
    return {
      message: "Här är det viktigaste för resten av dagen.",
      accent: "text-blue-200",
      glow: "bg-blue-400/10",
    };
  }

  return {
    message: "Dagen börjar gå mot sitt slut – här är kvällens läge.",
    accent: "text-violet-200",
    glow: "bg-violet-400/[0.10]",
  };
}

function getTodayDateString(): string {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function parseLocalDate(
  value: string
): Date {
  const [
    year,
    month,
    day,
  ] =
    value
      .split("-")
      .map(Number);

  return new Date(
    year,
    month - 1,
    day
  );
}

function getDaysUntil(
  value: string
): number {
  const today =
    parseLocalDate(
      getTodayDateString()
    );

  const date =
    parseLocalDate(
      value
    );

  const todayUtc =
    Date.UTC(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

  const dateUtc =
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

  return Math.round(
    (
      dateUtc -
      todayUtc
    ) /
      86_400_000
  );
}

function formatShortDate(
  value: string
): string {
  return parseLocalDate(
    value
  ).toLocaleDateString(
    "sv-SE",
    {
      weekday:
        "short",
      day:
        "numeric",
      month:
        "short",
    }
  );
}

function getCountdownLabel(
  days: number
): string {
  if (
    days === 0
  ) {
    return "Idag";
  }

  if (
    days === 1
  ) {
    return "Imorgon";
  }

  if (
    days > 1
  ) {
    return `Om ${days} dagar`;
  }

  return `${Math.abs(
    days
  )} dagar sedan`;
}

function InfoCard({
  icon,
  eyebrow,
  title,
  description,
  children,
}: {
  icon:
    React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  children?:
    React.ReactNode;
}) {
  return (
    <article className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-950/25 text-blue-300">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {eyebrow}
          </p>

          <p className="mt-1 break-words text-base font-bold text-white sm:text-lg">
            {title}
          </p>

          <p className="mt-1 text-sm leading-5 text-slate-400 sm:leading-6">
            {description}
          </p>

          {children}
        </div>
      </div>
    </article>
  );
}

export default function EverydayOverview() {
  const [
    now,
    setNow,
  ] =
    useState<Date | null>(
      null
    );

  const [
    calendarEvents,
    setCalendarEvents,
  ] =
    useState<
      GoogleCalendarEvent[]
    >([]);

  const [
    countdowns,
    setCountdowns,
  ] =
    useState<
      CountdownRow[]
    >([]);

  const [
    familyEvents,
    setFamilyEvents,
  ] =
    useState<
      FamilyEvent[]
    >([]);

  const [
    weather,
    setWeather,
  ] =
    useState<
      EverydayWeather | null
    >(null);

  const [
    electricity,
    setElectricity,
  ] =
    useState<
      ElectricityData | null
    >(null);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    hasPartialError,
    setHasPartialError,
  ] =
    useState(false);

  const loadData =
    useCallback(
      async (
        showLoader = true,
        forceRefresh = false
      ) => {
        if (showLoader) {
          setIsLoading(true);
        }

        setHasPartialError(false);

      try {
        const [
          calendarResponse,
          countdownResult,
          familyMembers,
          weatherResponse,
          electricityResponse,
        ] =
          await Promise.all([
            fetch(
              "/api/google-calendar",
              {
                cache:
                  "no-store",
              }
            ),

            supabase
              .from(
                "countdowns"
              )
              .select(
                "id, title, event_date, created_at"
              )
              .gte(
                "event_date",
                getTodayDateString()
              )
              .order(
                "event_date",
                {
                  ascending:
                    true,
                }
              )
              .order(
                "created_at",
                {
                  ascending:
                    true,
                }
              ),

            getFamilyMembersFromDatabase(),

            fetch(
              "/api/everyday-weather",
              forceRefresh
                ? {
                    cache:
                      "reload",
                  }
                : undefined
            ),

            fetch(
              "/api/electricity",
              forceRefresh
                ? {
                    cache:
                      "reload",
                  }
                : undefined
            ),
          ]);

        if (
          calendarResponse.ok
        ) {
          const calendarData =
            (await calendarResponse.json()) as GoogleCalendarResponse;

          if (
            calendarData.connected ===
            true
          ) {
            setCalendarEvents(
              calendarData.events ??
                []
            );
          } else {
            console.error(
              "Vardagen: Google Kalender är inte ansluten:",
              calendarData.error
            );
            setCalendarEvents(
              []
            );
            setHasPartialError(
              true
            );
          }
        } else {
          console.error(
            "Vardagen: kunde inte hämta Google Kalender."
          );
          setCalendarEvents(
            []
          );
          setHasPartialError(
            true
          );
        }

        if (
          countdownResult.error
        ) {
          console.error(
            "Vardagen: kunde inte hämta nedräkningar:",
            countdownResult.error
          );
          setHasPartialError(
            true
          );
        } else {
          setCountdowns(
            (
              countdownResult.data ??
              []
            ) as CountdownRow[]
          );
        }

        setFamilyEvents(
          createUpcomingFamilyEvents(
            familyMembers
          )
        );

        if (
          weatherResponse.ok
        ) {
          const weatherData =
            (await weatherResponse.json()) as EverydayWeather;

          setWeather(
            weatherData
          );
        } else {
          setWeather(null);
          setHasPartialError(
            true
          );
        }

        if (
          electricityResponse.ok
        ) {
          const electricityData =
            (await electricityResponse.json()) as ElectricityData;

          if (
            Array.isArray(
              electricityData.prices
            )
          ) {
            setElectricity(
              electricityData
            );
          } else {
            setElectricity(
              null
            );
            setHasPartialError(
              true
            );
          }
        } else {
          setElectricity(
            null
          );
          setHasPartialError(
            true
          );
        }
      } catch (error) {
        console.error(
          "Vardagen kunde inte hämta dagens data:",
          error
        );

        setHasPartialError(
          true
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadData();

    const refreshId =
      window.setInterval(
        () => {
          void loadData(false);
        },
        15 * 60 * 1000
      );

    return () => {
      window.clearInterval(
        refreshId
      );
    };
  }, [loadData]);

  useEffect(() => {
    setNow(
      new Date()
    );

    const clockId =
      window.setInterval(
        () => {
          setNow(
            new Date()
          );
        },
        60_000
      );

    return () => {
      window.clearInterval(
        clockId
      );
    };
  }, []);

  const nextFamilyEvent =
    useMemo(
      () =>
        familyEvents.find(
          (event) =>
            event.daysUntil >=
            0
        ) ??
        null,
      [familyEvents]
    );

  const nextCountdown =
    countdowns[0] ??
    null;

  const todaysCalendarEvents =
    useMemo(() => {
      const today =
        getStockholmDateKey(
          new Date().toISOString()
        );

      return calendarEvents
        .filter(
          (event) =>
            event.startTime &&
            getStockholmDateKey(
              event.startTime
            ) === today
        )
        .sort(
          (
            first,
            second
          ) => {
            if (
              first.allDay !==
              second.allDay
            ) {
              return first.allDay
                ? -1
                : 1;
            }

            if (
              !first.startTime ||
              !second.startTime
            ) {
              return 0;
            }

            return (
              new Date(
                first.startTime
              ).getTime() -
              new Date(
                second.startTime
              ).getTime()
            );
          }
        );
    }, [calendarEvents]);

  const nextCalendarEvent =
    todaysCalendarEvents[0] ??
    null;

  const calendarDescription =
    nextCalendarEvent
      ? nextCalendarEvent.allDay
        ? "Hela dagen"
        : nextCalendarEvent.startTime
          ? `Kl. ${formatCalendarTime(
              nextCalendarEvent.startTime
            )}${
              nextCalendarEvent.location
                ? ` · ${nextCalendarEvent.location}`
                : ""
            }`
          : nextCalendarEvent.location ??
            "Kommande händelse idag."
      : "Inga händelser kvar i Google Kalender idag.";

  const cheapestElectricityTime =
    electricity
      ? formatHour(
          electricity.minPrice.time_start
        )
      : null;

  const cheapestElectricityPrice =
    electricity
      ? formatPrice(
          electricity.minPrice.SEK_per_kWh
        )
      : null;

  const dayPhase =
    now
      ? getDayPhase(
          now.getHours()
        )
      : null;

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
                <Home
                  size={18}
                />

                <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                  Vardagen
                </p>
              </div>

              <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
                {now
                  ? getGreeting(
                      now.getHours()
                    )
                  : "Hej"} 👋
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
                  <CalendarDays
                    size={16}
                  />

                  {now
                    ? now.toLocaleDateString(
                        "sv-SE",
                        {
                          weekday:
                            "long",
                          day:
                            "numeric",
                          month:
                            "long",
                        }
                      )
                    : "Laddar datum…"}
                </span>

                <span className="flex items-center gap-2">
                  <Clock3
                    size={16}
                  />

                  {now
                    ? now.toLocaleTimeString(
                        "sv-SE",
                        {
                          hour:
                            "2-digit",
                          minute:
                            "2-digit",
                        }
                      )
                    : "--:--"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadData(
                  true,
                  true
                )
              }
              disabled={
                isLoading
              }
              className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-300/15 bg-blue-400/10 px-4 py-2.5 text-sm font-semibold text-blue-100 transition hover:bg-blue-400/20 disabled:opacity-50 sm:w-auto"
            >
              <RefreshCw
                size={16}
                className={
                  isLoading
                    ? "animate-spin"
                    : ""
                }
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
                Någon del av dagens information kunde inte hämtas, men övriga delar visas som vanligt.
              </p>
            </div>
          )}

          {weather && (
            <div className="mt-6 rounded-3xl border border-sky-300/15 bg-gradient-to-br from-sky-400/[0.09] via-blue-400/[0.05] to-transparent p-4 sm:p-5 lg:p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-300/15 bg-sky-400/10 text-sky-300">
                    <CloudSun
                      size={29}
                    />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-300">
                      Dagens väder
                    </p>

                    <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <p className="text-3xl font-black text-white">
                        {Math.round(
                          weather.temperature
                        )}
                        °
                      </p>

                      <p className="font-semibold text-slate-200">
                        {
                          weather.description
                        }
                      </p>
                    </div>

                    <p className="mt-1 text-sm text-slate-400">
                      {weather.location} · Högst{" "}
                      {Math.round(
                        weather.temperatureMax
                      )}
                      ° · Lägst{" "}
                      {Math.round(
                        weather.temperatureMin
                      )}
                      ° · Känns som{" "}
                      {Math.round(
                        weather.apparentTemperature
                      )}
                      °
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 xl:min-w-[28rem]">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/25 px-3 py-3 sm:px-4">
                    <p className="text-[11px] leading-4 text-slate-500 sm:text-xs">
                      🌧 Regnrisk
                    </p>

                    <p className="mt-1 font-bold text-white">
                      {Math.round(
                        weather.precipitationProbability
                      )}
                      %
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/25 px-3 py-3 sm:px-4">
                    <p className="text-[11px] leading-4 text-slate-500 sm:text-xs">
                      🌬 Vind
                    </p>

                    <p className="mt-1 font-bold text-white">
                      {Math.round(
                        weather.windSpeed
                      )}{" "}
                      m/s
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/25 px-3 py-3 sm:px-4">
                    <p className="text-[11px] leading-4 text-slate-500 sm:text-xs">
                      ☀️ UV
                    </p>

                    <p className="mt-1 font-bold text-white">
                      {Math.round(
                        weather.uvIndex
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-white/10 pt-4">
                {weather.outdoor ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-300/15 bg-emerald-400/[0.08] text-lg">
                        🌿
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-300">
                          Bästa tiden att vara ute
                        </p>

                        <p className="mt-1 break-words text-base font-bold text-white sm:text-lg">
                          {weather.outdoor.start}–{weather.outdoor.end}
                        </p>
                      </div>
                    </div>

                    <p className="max-w-2xl text-sm leading-5 text-slate-400 sm:text-right sm:leading-6">
                      {weather.outdoor.reason}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    Ingen lämplig utetid återstår att bedöma idag.
                  </p>
                )}
              </div>

              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-300/15 bg-amber-400/[0.08] text-amber-300">
                      <Zap size={18} />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-300">
                        Billigaste elen idag
                      </p>

                      <p className="mt-1 break-words text-base font-bold text-white sm:text-lg">
                        {cheapestElectricityTime ??
                          "Ingen prisdata"}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm leading-6 text-slate-400 sm:text-right">
                    {cheapestElectricityPrice !==
                    null
                      ? `${cheapestElectricityPrice} kr/kWh`
                      : "Elpriset kunde inte hämtas just nu."}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <InfoCard
              icon={
                <CalendarDays
                  size={21}
                />
              }
              eyebrow="Dagsplanering"
              title={
                nextCalendarEvent
                  ? nextCalendarEvent.title
                  : "Inget planerat idag"
              }
              description={
                calendarDescription
              }
            >
              {todaysCalendarEvents.length >
                1 && (
                <div className="mt-3 divide-y divide-white/10 border-t border-white/10 pt-1">
                  {todaysCalendarEvents
                    .slice(1)
                    .map(
                      (event) => (
                        <div
                          key={
                            event.id
                          }
                          className="flex items-start justify-between gap-3 py-2 text-sm"
                        >
                          <p className="min-w-0 flex-1 break-words font-semibold leading-5 text-slate-200">
                            {
                              event.title
                            }
                          </p>

                          <p className="shrink-0 text-xs text-slate-400">
                            {event.allDay
                              ? "Hela dagen"
                              : event.startTime
                                ? formatCalendarTime(
                                    event.startTime
                                  )
                                : ""}
                          </p>
                        </div>
                      )
                    )}
                </div>
              )}
            </InfoCard>

            <InfoCard
              icon={
                <CalendarClock
                  size={21}
                />
              }
              eyebrow="Familjen"
              title={
                nextFamilyEvent
                  ? nextFamilyEvent.title
                  : "Inget nära inpå"
              }
              description={
                nextFamilyEvent
                  ? `${getCountdownLabel(
                      nextFamilyEvent.daysUntil
                    )} · ${formatShortDate(
                      nextFamilyEvent.date
                    )}`
                  : "Ingen kommande födelsedag eller namnsdag hittades."
              }
            />

            <InfoCard
              icon={
                <PartyPopper
                  size={21}
                />
              }
              eyebrow="Nedräkning"
              title={
                nextCountdown
                  ? nextCountdown.title
                  : "Ingen nedräkning"
              }
              description={
                nextCountdown
                  ? `${getCountdownLabel(
                      getDaysUntil(
                        nextCountdown.event_date
                      )
                    )} · ${formatShortDate(
                      nextCountdown.event_date
                    )}`
                  : "Lägg till något att längta till under Hemmet."
              }
            />


          </div>
        </div>
      </section>

    </div>
  );
}