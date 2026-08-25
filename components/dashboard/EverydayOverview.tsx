"use client";

import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CloudSun,
  Clock3,
  ExternalLink,
  Gift,
  Home,
  LoaderCircle,
  PartyPopper,
  RefreshCw,
  MapPin,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import {
  createUpcomingFamilyEvents,
  type FamilyEvent,
} from "@/lib/family";
import {
  getFamilyMembersFromDatabase,
} from "@/lib/family-db";

type DayPlan = {
  id: string;
  plan_date: string;
  day_name: string | null;
  location: string | null;
  travel: string | null;
  accommodation: string | null;
  activity: string | null;
  information: string | null;
};

type CountdownRow = {
  id: string;
  title: string;
  event_date: string;
  created_at: string;
};

type TodayNotice = {
  id: string;
  type:
    | "weather"
    | "birthday"
    | "nameDay"
    | "countdown";
  title: string;
  description: string;
  severity?:
    | "yellow"
    | "orange"
    | "red"
    | "unknown";
  startsAt?: string | null;
  endsAt?: string | null;
  url?: string;
};

type TodayStatusResponse = {
  notices?: TodayNotice[];
  partialError?: boolean;
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

function getNoticeClasses(
  notice: TodayNotice
): string {
  if (
    notice.type !==
    "weather"
  ) {
    return "border-blue-300/15 bg-blue-400/[0.06]";
  }

  switch (
    notice.severity
  ) {
    case "red":
      return "border-red-300/20 bg-red-400/[0.08]";

    case "orange":
      return "border-orange-300/20 bg-orange-400/[0.08]";

    case "yellow":
      return "border-yellow-300/20 bg-yellow-400/[0.08]";

    default:
      return "border-slate-300/15 bg-white/[0.04]";
  }
}

function getNoticeIcon(
  notice: TodayNotice
) {
  switch (
    notice.type
  ) {
    case "birthday":
      return Gift;

    case "nameDay":
      return Sparkles;

    case "countdown":
      return PartyPopper;

    case "weather":
    default:
      return TriangleAlert;
  }
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
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-950/25 text-blue-300">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {eyebrow}
          </p>

          <p className="mt-1 text-lg font-bold text-white">
            {title}
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-400">
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
    todayPlan,
    setTodayPlan,
  ] =
    useState<
      DayPlan | null
    >(null);

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
    notices,
    setNotices,
  ] =
    useState<
      TodayNotice[]
    >([]);

  const [
    weather,
    setWeather,
  ] =
    useState<
      EverydayWeather | null
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
    useCallback(async () => {
      setIsLoading(true);
      setHasPartialError(false);

      try {
        const [
          dayPlanResult,
          countdownResult,
          familyMembers,
          todayStatusResponse,
          weatherResponse,
        ] =
          await Promise.all([
            supabase
              .from(
                "vacation_plan"
              )
              .select(
                "id, plan_date, day_name, location, travel, accommodation, activity, information"
              )
              .eq(
                "plan_date",
                getTodayDateString()
              )
              .maybeSingle(),

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
              "/api/today-status",
              {
                cache:
                  "no-store",
              }
            ),

            fetch(
              "/api/everyday-weather",
              {
                cache:
                  "no-store",
              }
            ),
          ]);

        if (
          dayPlanResult.error
        ) {
          console.error(
            "Vardagen: kunde inte hämta dagens dagsplanering:",
            dayPlanResult.error
          );
          setTodayPlan(null);
          setHasPartialError(
            true
          );
        } else {
          setTodayPlan(
            (dayPlanResult.data as DayPlan | null) ??
              null
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
          todayStatusResponse.ok
        ) {
          const status =
            (await todayStatusResponse.json()) as TodayStatusResponse;

          setNotices(
            status.notices ??
            []
          );

          if (
            status.partialError
          ) {
            setHasPartialError(
              true
            );
          }
        } else {
          setNotices([]);
          setHasPartialError(
            true
          );
        }

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
    }, []);

  useEffect(() => {
    void loadData();

    const refreshId =
      window.setInterval(
        () => {
          void loadData();
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

  return (
    <div className="grid w-full min-w-0 grid-cols-12 gap-5">
      <section className="relative col-span-12 overflow-hidden rounded-[2rem] border border-blue-300/15 bg-gradient-to-br from-slate-950 via-blue-950/35 to-violet-950/25 p-6 shadow-2xl shadow-blue-950/20 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl" />

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
                void loadData()
              }
              disabled={
                isLoading
              }
              className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-300/15 bg-blue-400/10 px-4 py-2.5 text-sm font-semibold text-blue-100 transition hover:bg-blue-400/20 disabled:opacity-50"
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
            <div className="mt-6 rounded-3xl border border-sky-300/15 bg-gradient-to-br from-sky-400/[0.09] via-blue-400/[0.05] to-transparent p-5 sm:p-6">
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

                <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[28rem]">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3">
                    <p className="text-xs text-slate-500">
                      🌧 Regnrisk
                    </p>

                    <p className="mt-1 font-bold text-white">
                      {Math.round(
                        weather.precipitationProbability
                      )}
                      %
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3">
                    <p className="text-xs text-slate-500">
                      🌬 Vind
                    </p>

                    <p className="mt-1 font-bold text-white">
                      {Math.round(
                        weather.windSpeed
                      )}{" "}
                      m/s
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3">
                    <p className="text-xs text-slate-500">
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
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-300">
                        Bästa tiden att vara ute
                      </p>

                      <p className="mt-1 text-lg font-bold text-white">
                        {weather.outdoor.start}–{weather.outdoor.end}
                      </p>
                    </div>

                    <p className="max-w-2xl text-sm leading-6 text-slate-400 sm:text-right">
                      {weather.outdoor.reason}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    Ingen lämplig utetid återstår att bedöma idag.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <InfoCard
              icon={
                <CalendarDays
                  size={21}
                />
              }
              eyebrow="Dagsplanering"
              title={
                todayPlan?.activity ??
                todayPlan?.location ??
                "Inget planerat idag"
              }
              description={
                todayPlan
                  ? [
                      todayPlan.location &&
                      todayPlan.activity
                        ? todayPlan.location
                        : null,
                      todayPlan.travel
                        ? `Resa: ${todayPlan.travel}`
                        : null,
                      todayPlan.information,
                    ]
                      .filter(Boolean)
                      .join(" · ") ||
                    "Det finns en planering registrerad för idag."
                  : "Lägg till dagens planer under Hemmet."
              }
            >
              {todayPlan?.accommodation && (
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-300">
                  <MapPin size={14} />
                  Boende: {todayPlan.accommodation}
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

            <InfoCard
              icon={
                notices.length >
                0 ? (
                  <TriangleAlert
                    size={21}
                  />
                ) : (
                  <CheckCircle2
                    size={21}
                  />
                )
              }
              eyebrow="Idag"
              title={
                notices.length >
                0
                  ? `${notices.length} ${
                      notices.length ===
                      1
                        ? "händelse"
                        : "händelser"
                    }`
                  : "Lugnt idag"
              }
              description={
                notices.length >
                0
                  ? notices[0]
                      .title
                  : "Inga särskilda händelser eller varningar just nu."
              }
            />
          </div>
        </div>
      </section>

      {notices.length >
        0 && (
        <section className="col-span-12 rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
              Viktigt idag
            </p>

            <h3 className="mt-1 text-xl font-bold text-white">
              Dagens händelser
            </h3>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {notices.map(
              (notice) => {
                const Icon =
                  getNoticeIcon(
                    notice
                  );

                return (
                  <article
                    key={
                      notice.id
                    }
                    className={[
                      "rounded-2xl border p-4",
                      getNoticeClasses(
                        notice
                      ),
                    ].join(
                      " "
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Icon
                        size={20}
                        className="mt-0.5 shrink-0 text-amber-300"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white">
                          {
                            notice.title
                          }
                        </p>

                        <p className="mt-1 text-sm leading-6 text-slate-400">
                          {
                            notice.description
                          }
                        </p>

                        {notice.type === "weather" &&
                          notice.url && (
                            <a
                              href={
                                notice.url
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-amber-200 transition hover:text-amber-100"
                            >
                              Läs mer hos SMHI
                              <ExternalLink
                                size={15}
                              />
                            </a>
                          )}
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        </section>
      )}
    </div>
  );
}