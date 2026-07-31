"use client";

import {
  AlertTriangle,
  Cake,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Gift,
  LoaderCircle,
  PartyPopper,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

type TodayNoticeType =
  | "weather"
  | "birthday"
  | "nameDay"
  | "countdown";

type WeatherWarningLevel =
  | "yellow"
  | "orange"
  | "red"
  | "unknown";

type TodayNotice = {
  id: string;
  type: TodayNoticeType;
  title: string;
  description: string;
  severity?: WeatherWarningLevel;
  startsAt?: string;
  endsAt?: string;
  url?: string;
};

type CountdownDatabaseRow = {
  id: string;
  title: string;
  event_date: string;
};

type TodayStatusApiResponse = {
  notices?: TodayNotice[];
  updatedAt?: string;
  partialError?: boolean;
};

const STORAGE_KEY = "today-status-minimized";
const DEFAULT_SMHI_WARNING_URL =
  "https://www.smhi.se/vader/varningar-och-meddelanden";

function getTodayDateString(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createCountdownNotice(
  countdown: CountdownDatabaseRow
): TodayNotice {
  return {
    id: `countdown-${countdown.id}`,
    type: "countdown",
    title: "Nedräkning avslutas idag",
    description: `🎉 ${countdown.title} är idag!`,
  };
}

function getNoticeIcon(type: TodayNoticeType) {
  switch (type) {
    case "weather":
      return AlertTriangle;

    case "birthday":
      return Cake;

    case "nameDay":
      return Gift;

    case "countdown":
      return PartyPopper;

    default:
      return CalendarClock;
  }
}

function getWeatherClasses(
  severity: WeatherWarningLevel | undefined
): string {
  switch (severity) {
    case "red":
      return "border-red-400/30 bg-red-400/10 text-red-300";

    case "orange":
      return "border-orange-400/30 bg-orange-400/10 text-orange-300";

    case "yellow":
      return "border-yellow-300/30 bg-yellow-300/10 text-yellow-200";

    default:
      return "border-amber-400/30 bg-amber-400/10 text-amber-300";
  }
}

function getNoticeIconClasses(notice: TodayNotice): string {
  if (notice.type === "weather") {
    return getWeatherClasses(notice.severity);
  }

  switch (notice.type) {
    case "birthday":
      return "border-rose-400/20 bg-rose-400/15 text-rose-300";

    case "nameDay":
      return "border-violet-400/20 bg-violet-400/15 text-violet-300";

    case "countdown":
      return "border-blue-400/20 bg-blue-400/15 text-blue-300";

    default:
      return "border-emerald-400/20 bg-emerald-400/15 text-emerald-300";
  }
}

function getNoticeTextColor(notice: TodayNotice): string {
  if (notice.type !== "weather") {
    return "text-slate-300";
  }

  switch (notice.severity) {
    case "red":
      return "text-red-300";

    case "orange":
      return "text-orange-300";

    case "yellow":
      return "text-yellow-200";

    default:
      return "text-amber-300";
  }
}

function formatWarningTime(dateString: string): string | null {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString("sv-SE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getWarningPeriod(notice: TodayNotice): string | null {
  const start = notice.startsAt
    ? formatWarningTime(notice.startsAt)
    : null;

  const end = notice.endsAt
    ? formatWarningTime(notice.endsAt)
    : null;

  if (start && end) {
    return `${start}–${end}`;
  }

  if (start) {
    return `Från ${start}`;
  }

  if (end) {
    return `Till ${end}`;
  }

  return null;
}

function getSummary(notices: TodayNotice[]): {
  title: string;
  description: string;
  notice?: TodayNotice;
} {
  const weatherNotice = notices.find(
    (notice) => notice.type === "weather"
  );

  if (weatherNotice) {
    return {
      title: weatherNotice.title,
      description:
        notices.length > 1
          ? `Dessutom ${notices.length - 1} annan händelse idag`
          : "Tryck för att visa mer information",
      notice: weatherNotice,
    };
  }

  const birthdayNotice = notices.find(
    (notice) => notice.type === "birthday"
  );

  if (birthdayNotice) {
    return {
      title: birthdayNotice.description,
      description:
        notices.length > 1
          ? `${notices.length} händelser idag`
          : "En familjehändelse idag",
      notice: birthdayNotice,
    };
  }

  const countdownNotice = notices.find(
    (notice) => notice.type === "countdown"
  );

  if (countdownNotice) {
    return {
      title: countdownNotice.description,
      description:
        notices.length > 1
          ? `${notices.length} händelser idag`
          : "Nedräkningen är framme",
      notice: countdownNotice,
    };
  }

  const nameDayNotice = notices.find(
    (notice) => notice.type === "nameDay"
  );

  if (nameDayNotice) {
    return {
      title: nameDayNotice.description,
      description:
        notices.length > 1
          ? `${notices.length} händelser idag`
          : "Namnsdag idag",
      notice: nameDayNotice,
    };
  }

  return {
    title: "Lugnt idag",
    description: "Inga aktuella händelser",
  };
}

export default function TodayStatus() {
  const [notices, setNotices] = useState<TodayNotice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);

  const summary = useMemo(() => getSummary(notices), [notices]);

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);

    try {
      const today = getTodayDateString();

      const [statusResponse, countdownResponse] = await Promise.all([
        fetch("/api/today-status", {
          cache: "no-store",
        }),

        supabase
          .from("countdowns")
          .select("id, title, event_date")
          .eq("event_date", today)
          .order("created_at", {
            ascending: true,
          }),
      ]);

      let apiNotices: TodayNotice[] = [];

      if (statusResponse.ok) {
        const statusData =
          (await statusResponse.json()) as TodayStatusApiResponse;

        apiNotices = statusData.notices ?? [];

        if (statusData.partialError) {
          setHasError(true);
        }
      } else {
        console.error(
          "API-routen för dagens status svarade med ett fel."
        );
        setHasError(true);
      }

      if (countdownResponse.error) {
        console.error(
          "Kunde inte hämta dagens nedräkningar:",
          countdownResponse.error
        );
        setHasError(true);
      }

      const countdownRows =
        (countdownResponse.data ?? []) as CountdownDatabaseRow[];

      const countdownNotices = countdownRows.map(
        createCountdownNotice
      );

      setNotices([...apiNotices, ...countdownNotices]);
    } catch (error) {
      console.error("Kunde inte hämta dagens status:", error);
      setHasError(true);
      setNotices([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedValue = window.localStorage.getItem(STORAGE_KEY);

    if (savedValue === "false") {
      setIsMinimized(false);
    } else {
      setIsMinimized(true);
    }
  }, []);

  useEffect(() => {
    void loadStatus();

    const intervalId = window.setInterval(() => {
      void loadStatus();
    }, 15 * 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadStatus]);

  function toggleMinimized() {
    setIsMinimized((currentValue) => {
      const nextValue = !currentValue;
      window.localStorage.setItem(STORAGE_KEY, String(nextValue));
      return nextValue;
    });
  }

  if (isLoading) {
    return (
      <div className="flex w-full items-center gap-3 rounded-3xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur-xl sm:w-auto sm:min-w-72">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-400/15 text-blue-300">
          <LoaderCircle size={24} className="animate-spin" />
        </div>

        <div className="min-w-0">
          <p className="text-sm text-slate-300">Idag</p>
          <p className="font-semibold text-white">
            Hämtar dagens status…
          </p>
        </div>
      </div>
    );
  }

  const primaryNotice = summary.notice;
  const PrimaryIcon = primaryNotice
    ? getNoticeIcon(primaryNotice.type)
    : CheckCircle2;

  const primaryIconClasses = primaryNotice
    ? getNoticeIconClasses(primaryNotice)
    : "border-emerald-300/20 bg-emerald-400/15 text-emerald-300";

  return (
    <section className="w-full overflow-hidden rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl transition-all duration-300 sm:w-auto sm:min-w-80 sm:max-w-md">
      <button
        type="button"
        onClick={toggleMinimized}
        aria-expanded={!isMinimized}
        aria-label={
          isMinimized
            ? "Visa dagens status"
            : "Minimera dagens status"
        }
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
      >
        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
            primaryIconClasses,
          ].join(" ")}
        >
          <PrimaryIcon size={21} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
            Idag
          </p>
          <p className="truncate text-sm font-semibold text-white">
            {summary.title}
          </p>
          {isMinimized && (
            <p className="truncate text-xs text-slate-400">
              {hasError
                ? "Vissa uppgifter kunde inte kontrolleras"
                : summary.description}
            </p>
          )}
        </div>

        <ChevronDown
          size={20}
          className={[
            "shrink-0 text-slate-400 transition-transform duration-300",
            isMinimized ? "rotate-0" : "rotate-180",
          ].join(" ")}
        />
      </button>

      <div
        className={[
          "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
          isMinimized
            ? "grid-rows-[0fr] opacity-0"
            : "grid-rows-[1fr] opacity-100",
        ].join(" ")}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-white/10 px-4 pb-4 pt-3">
            {notices.length === 0 ? (
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.06] p-3">
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-emerald-300"
                />
                <div>
                  <p className="text-sm font-semibold text-white">
                    Lugnt idag
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                    {hasError
                      ? "Vissa uppgifter kunde inte kontrolleras."
                      : "Inga aktuella notiser eller SMHI-varningar."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {notices.map((notice) => {
                  const NoticeIcon = getNoticeIcon(notice.type);
                  const warningPeriod =
                    notice.type === "weather"
                      ? getWarningPeriod(notice)
                      : null;

                  const content = (
                    <>
                      <NoticeIcon
                        size={17}
                        className={[
                          "mt-0.5 shrink-0",
                          getNoticeTextColor(notice),
                        ].join(" ")}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-white">
                            {notice.title}
                          </p>

                          {notice.type === "weather" && (
                            <ExternalLink
                              size={14}
                              className="mt-0.5 shrink-0 text-slate-400"
                            />
                          )}
                        </div>

                        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                          {notice.description}
                        </p>

                        {warningPeriod && (
                          <p className="mt-1 text-xs font-medium capitalize text-slate-300">
                            {warningPeriod}
                          </p>
                        )}

                        {notice.type === "weather" && (
                          <p className="mt-1 text-xs font-medium text-blue-300">
                            Läs mer hos SMHI
                          </p>
                        )}
                      </div>
                    </>
                  );

                  if (notice.type === "weather") {
                    return (
                      <a
                        key={notice.id}
                        href={notice.url ?? DEFAULT_SMHI_WARNING_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 active:translate-y-0"
                      >
                        {content}
                      </a>
                    );
                  }

                  return (
                    <article
                      key={notice.id}
                      className="flex items-start gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3"
                    >
                      {content}
                    </article>
                  );
                })}
              </div>
            )}

            {hasError && notices.length > 0 && (
              <p className="mt-3 text-xs text-amber-300">
                Vissa uppgifter kunde inte kontrolleras.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}