"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Beef,
  ChevronDown,
  ChevronUp,
  Drumstick,
  Earth,
  Fish,
  Leaf,
  RefreshCw,
  Sprout,
  TriangleAlert,
  Utensils,
} from "lucide-react";

const STORAGE_KEY = "family-dashboard:school-lunch:collapsed";
const STOCKHOLM_TIME_ZONE = "Europe/Stockholm";

type LunchDay = {
  date: string | null;
  day: string;
  meals: string[];
};

type SchoolLunchResponse = {
  connected: boolean;
  school?: {
    name: string;
    slug: string;
  };
  source?: string;
  days?: LunchDay[];
  error?: string;
};

const WEEKDAYS = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag"];

type MealCategory = {
  label: string;
  icon: typeof Utensils;
};

function getMealCategory(meal: string): MealCategory | null {
  const match = meal.match(/\(([^)]+)\)\s*[,.;]?\s*$/);
  if (!match) return null;

  const category = match[1].trim().toLocaleLowerCase("sv-SE");

  if (category.includes("fågel") || category.includes("kyckling")) {
    return { label: "Fågel", icon: Drumstick };
  }

  if (
    category.includes("vegetar") ||
    category.includes("vegansk") ||
    category.includes("vegan")
  ) {
    return { label: "Vegetariskt", icon: Leaf };
  }

  if (
    category.includes("nöt") ||
    category.includes("nötkött") ||
    category.includes("ko")
  ) {
    return { label: "Nöt", icon: Beef };
  }

  if (category.includes("fisk")) {
    return { label: "Fisk", icon: Fish };
  }

  if (
    category.includes("klimatsmart") ||
    category.includes("klimat")
  ) {
    return { label: "Klimatsmart", icon: Earth };
  }

  if (
    category.includes("växtbas") ||
    category.includes("grön")
  ) {
    return { label: "Växtbaserat", icon: Sprout };
  }

  return null;
}


function getMealDisplayText(meal: string) {
  return meal
    .replace(/\s*\([^)]+\)\s*[,.;]?\s*$/, "")
    .trim();
}

function stockholmDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: STOCKHOLM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

function stockholmWeekday(date = new Date()) {
  const weekday = new Intl.DateTimeFormat("sv-SE", {
    timeZone: STOCKHOLM_TIME_ZONE,
    weekday: "long",
  }).format(date);

  return weekday.charAt(0).toLocaleUpperCase("sv-SE") + weekday.slice(1);
}

function getIsoWeekNumber(date = new Date()) {
  const stockholmDate = stockholmDateKey(date);
  const [year, month, day] = stockholmDate.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  const weekday = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - weekday);

  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
}

function formatDate(dateKey: string | null) {
  if (!dateKey) return null;

  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return null;

  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(Date.UTC(year, month - 1, day)))
    .replace(".", "");
}

export default function SchoolLunchWidget() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [hasLoadedPreference, setHasLoadedPreference] = useState(false);
  const [data, setData] = useState<SchoolLunchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    try {
      const savedCollapsed = window.localStorage.getItem(STORAGE_KEY);
      setIsCollapsed(savedCollapsed === null ? true : savedCollapsed === "true");
    } catch {
      // Privat läge eller blockerad lagring: använd standardläget.
    }
    setHasLoadedPreference(true);
  }, []);

  const loadLunch = useCallback(async (manual = false) => {
    manual ? setIsRefreshing(true) : setIsLoading(true);

    try {
      const response = await fetch("/api/school-lunch", { cache: "no-store" });
      const payload = (await response.json()) as SchoolLunchResponse;
      setData(payload);
    } catch {
      setData({
        connected: false,
        days: [],
        error: "Kunde inte kontakta skolmatsedeln.",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadLunch();

    const interval = window.setInterval(() => {
      void loadLunch();
    }, 60 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, [loadLunch]);

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);

    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Widgeten ska fortfarande gå att minimera om lagring saknas.
    }
  };

  const todayDate = stockholmDateKey();
  const todayWeekday = stockholmWeekday();
  const weekNumber = getIsoWeekNumber();

  const daysByName = useMemo(() => {
    const map = new Map<string, LunchDay>();

    for (const day of data?.days ?? []) {
      map.set(day.day.toLocaleLowerCase("sv-SE"), day);
    }

    return map;
  }, [data?.days]);

  return (
    <section
      className={`w-full min-w-0 rounded-3xl border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/10 backdrop-blur-xl ${
        isCollapsed ? "p-3 sm:p-3" : "p-5 sm:p-6"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex shrink-0 items-center justify-center rounded-xl border border-blue-300/15 bg-blue-400/[0.08] text-blue-300 ${
            isCollapsed ? "h-9 w-9" : "h-11 w-11"
          }`}
        >
          <Utensils size={21} aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-white">Skollunch</h2>
          {!isCollapsed && (
            <p className="mt-0.5 text-xs text-slate-400">
              Vecka {weekNumber}
              {data?.school?.name ? ` · ${data.school.name}` : ""}
            </p>
          )}
        </div>

        {!isCollapsed && (
          <button
            type="button"
            onClick={() => void loadLunch(true)}
            disabled={isRefreshing}
            aria-label="Uppdatera skollunch"
            title="Uppdatera"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
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
          onClick={toggleCollapsed}
          disabled={!hasLoadedPreference}
          aria-expanded={!isCollapsed}
          aria-label={`${isCollapsed ? "Visa" : "Minimera"} Skollunch`}
          title={isCollapsed ? "Visa" : "Minimera"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-400 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        >
          {isCollapsed ? (
            <ChevronDown size={18} aria-hidden="true" />
          ) : (
            <ChevronUp size={18} aria-hidden="true" />
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div className="mt-5">
          {isLoading && !data ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/20 px-5 py-8 text-center">
              <RefreshCw
                size={22}
                className="mx-auto animate-spin text-blue-300"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm text-slate-400">
                Hämtar veckans matsedel…
              </p>
            </div>
          ) : !data?.connected ? (
            <div className="rounded-2xl border border-amber-300/15 bg-amber-400/[0.06] px-5 py-6">
              <div className="flex items-start gap-3">
                <TriangleAlert
                  size={20}
                  className="mt-0.5 shrink-0 text-amber-300"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-semibold text-white">
                    Matsedeln kunde inte hämtas
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    {data?.error ?? "Försök igen om en stund."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {WEEKDAYS.map((weekday) => {
                const lunch = daysByName.get(
                  weekday.toLocaleLowerCase("sv-SE")
                );

                const isToday =
                  lunch?.date === todayDate ||
                  (!lunch?.date && weekday === todayWeekday);

                const dateLabel = formatDate(lunch?.date ?? null);

                return (
                  <article
                    key={weekday}
                    className={`rounded-2xl border px-4 py-3.5 sm:px-5 ${
                      isToday
                        ? "border-blue-300/30 bg-blue-400/[0.10]"
                        : "border-white/10 bg-slate-950/20"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3
                        className={`text-sm font-bold ${
                          isToday ? "text-blue-200" : "text-white"
                        }`}
                      >
                        {weekday}
                      </h3>

                      {dateLabel && (
                        <span className="text-xs text-slate-500">
                          {dateLabel}
                        </span>
                      )}

                      {isToday && (
                        <span className="rounded-full border border-blue-300/20 bg-blue-400/[0.10] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-200">
                          Idag
                        </span>
                      )}
                    </div>

                    {lunch?.meals?.length ? (
                      <div className="mt-2 space-y-1">
                        {lunch.meals.map((meal, index) => {
                          const category = getMealCategory(meal);
                          const MealIcon = category?.icon ?? Utensils;

                          return (
                            <div
                              key={`${weekday}-${index}-${meal}`}
                              className="flex items-start gap-2.5"
                            >
                              <span
                                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-slate-400"
                                title={category?.label ?? "Maträtt"}
                                aria-label={category?.label ?? "Maträtt"}
                              >
                                <MealIcon size={15} aria-hidden="true" />
                              </span>
                              <p className="min-w-0 text-sm leading-5 text-slate-300">
                                {getMealDisplayText(meal)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">
                        Ingen lunch publicerad.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {data?.connected && (
            <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-3 sm:px-5">
              <p className="text-sm leading-5 text-slate-400">
                I måltiden ingår salladsbuffé, knäckebröd, mjölk eller vatten.
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Vi reserverar oss för eventuella ändringar.
              </p>
            </div>
          )}

          <p className="mt-3 text-right text-[11px] text-slate-600">
            Källa: Skolmaten RSS
          </p>
        </div>
      )}
    </section>
  );
}
