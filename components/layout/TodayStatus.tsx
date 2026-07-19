"use client";

import {
  AlertTriangle,
  Cake,
  CalendarClock,
  CheckCircle2,
  Gift,
  LoaderCircle,
  PartyPopper,
} from "lucide-react";
import {
  useCallback,
  useEffect,
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

function getTodayDateString(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");
  const day = String(now.getDate()).padStart(
    2,
    "0"
  );

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

function getNoticeIconClasses(
  notice: TodayNotice
): string {
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

function formatWarningTime(
  dateString: string
): string | null {
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

function getWarningPeriod(
  notice: TodayNotice
): string | null {
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

export default function TodayStatus() {
  const [notices, setNotices] = useState<
    TodayNotice[]
  >([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [hasError, setHasError] =
    useState(false);

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);

    try {
      const today = getTodayDateString();

      const [
        statusResponse,
        countdownResponse,
      ] = await Promise.all([
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

        apiNotices =
          statusData.notices ?? [];

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
        (countdownResponse.data ??
          []) as CountdownDatabaseRow[];

      const countdownNotices =
        countdownRows.map(
          createCountdownNotice
        );

      setNotices([
        ...apiNotices,
        ...countdownNotices,
      ]);
    } catch (error) {
      console.error(
        "Kunde inte hämta dagens status:",
        error
      );

      setHasError(true);
      setNotices([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();

    const intervalId = window.setInterval(
      () => {
        void loadStatus();
      },
      15 * 60 * 1000
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadStatus]);

  if (isLoading) {
    return (
      <div className="flex w-full items-center gap-3 rounded-3xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur-xl sm:w-auto sm:min-w-72">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-400/15 text-blue-300">
          <LoaderCircle
            size={24}
            className="animate-spin"
          />
        </div>

        <div className="min-w-0">
          <p className="text-sm text-slate-300">
            Idag
          </p>

          <p className="font-semibold text-white">
            Hämtar dagens status…
          </p>
        </div>
      </div>
    );
  }

  if (notices.length === 0) {
    return (
      <div className="flex w-full items-center gap-3 rounded-3xl border border-emerald-300/15 bg-emerald-400/[0.08] px-5 py-4 backdrop-blur-xl sm:w-auto sm:min-w-72">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
          <CheckCircle2 size={24} />
        </div>

        <div className="min-w-0">
          <p className="text-sm text-slate-300">
            Idag
          </p>

          <p className="font-semibold text-white">
            Lugnt idag
          </p>

          <p className="mt-0.5 text-xs text-slate-400">
            {hasError
              ? "Vissa uppgifter kunde inte kontrolleras."
              : "Inga aktuella notiser eller SMHI-varningar."}
          </p>
        </div>
      </div>
    );
  }

  const primaryNotice = notices[0];
  const PrimaryIcon = getNoticeIcon(
    primaryNotice.type
  );

  return (
    <div className="w-full rounded-3xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur-xl sm:w-auto sm:min-w-80 sm:max-w-md">
      <div className="flex items-start gap-3">
        <div
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
            getNoticeIconClasses(
              primaryNotice
            ),
          ].join(" ")}
        >
          <PrimaryIcon size={24} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-300">
            {notices.length === 1
              ? "Aktuellt idag"
              : `${notices.length} saker idag`}
          </p>

          <div className="mt-2 space-y-3">
            {notices.map((notice) => {
              const NoticeIcon =
                getNoticeIcon(notice.type);

              const warningPeriod =
                notice.type === "weather"
                  ? getWarningPeriod(notice)
                  : null;

              return (
                <article
                  key={notice.id}
                  className="flex items-start gap-2"
                >
                  <NoticeIcon
                    size={16}
                    className={[
                      "mt-0.5 shrink-0",
                      notice.type === "weather"
                        ? notice.severity === "red"
                          ? "text-red-300"
                          : notice.severity ===
                              "orange"
                            ? "text-orange-300"
                            : "text-yellow-200"
                        : "text-slate-300",
                    ].join(" ")}
                  />

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {notice.title}
                    </p>

                    <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                      {notice.description}
                    </p>

                    {warningPeriod && (
                      <p className="mt-1 text-xs font-medium capitalize text-slate-300">
                        {warningPeriod}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {hasError && (
            <p className="mt-3 text-xs text-amber-300">
              Vissa uppgifter kunde inte
              kontrolleras.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}