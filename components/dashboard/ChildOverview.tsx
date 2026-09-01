"use client";

import {
  Baby,
  Cake,
  CalendarDays,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

type ChildOverviewProps = {
  memberId: string;
  displayName: string;
  emoji?: string;
};

type ChildData = {
  id: string;
  display_name: string;
  emoji: string;
  birthday: string;
};

function parseLocalDate(
  dateString: string
): Date {
  const [
    year,
    month,
    day,
  ] =
    dateString
      .split("-")
      .map(Number);

  return new Date(
    year,
    month - 1,
    day
  );
}

function startOfDay(
  date: Date
): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function daysBetween(
  start: Date,
  end: Date
): number {
  const startUtc =
    Date.UTC(
      start.getFullYear(),
      start.getMonth(),
      start.getDate()
    );

  const endUtc =
    Date.UTC(
      end.getFullYear(),
      end.getMonth(),
      end.getDate()
    );

  return Math.round(
    (endUtc - startUtc) /
      86_400_000
  );
}

function addMonthsClamped(
  date: Date,
  months: number
): Date {
  const target =
    new Date(
      date.getFullYear(),
      date.getMonth() +
        months,
      1
    );

  const lastDay =
    new Date(
      target.getFullYear(),
      target.getMonth() +
        1,
      0
    ).getDate();

  target.setDate(
    Math.min(
      date.getDate(),
      lastDay
    )
  );

  return target;
}

function getCalendarAge(
  birthdayString: string,
  referenceDate:
    Date = new Date()
): {
  years: number;
  months: number;
  days: number;
  totalDays: number;
} {
  const birthday =
    startOfDay(
      parseLocalDate(
        birthdayString
      )
    );

  const today =
    startOfDay(
      referenceDate
    );

  if (
    today <
    birthday
  ) {
    return {
      years: 0,
      months: 0,
      days: 0,
      totalDays: 0,
    };
  }

  let totalMonths =
    (
      today.getFullYear() -
      birthday.getFullYear()
    ) *
      12 +
    (
      today.getMonth() -
      birthday.getMonth()
    );

  let monthAnchor =
    addMonthsClamped(
      birthday,
      totalMonths
    );

  if (
    monthAnchor >
    today
  ) {
    totalMonths -= 1;

    monthAnchor =
      addMonthsClamped(
        birthday,
        totalMonths
      );
  }

  const years =
    Math.floor(
      totalMonths / 12
    );

  const months =
    totalMonths % 12;

  const days =
    daysBetween(
      monthAnchor,
      today
    );

  return {
    years,
    months,
    days,
    totalDays:
      daysBetween(
        birthday,
        today
      ),
  };
}

function getAgeTitle(
  age: {
    years: number;
    months: number;
    days: number;
  }
): string {
  const parts: string[] =
    [];

  if (
    age.years > 0
  ) {
    parts.push(
      `${age.years} år`
    );
  }

  if (
    age.months > 0 ||
    age.years === 0
  ) {
    parts.push(
      `${age.months} ${
        age.months === 1
          ? "månad"
          : "månader"
      }`
    );
  }

  parts.push(
    `${age.days} ${
      age.days === 1
        ? "dag"
        : "dagar"
    }`
  );

  return parts.join(
    " och "
  );
}

function formatBirthday(
  dateString: string
): string {
  return parseLocalDate(
    dateString
  ).toLocaleDateString(
    "sv-SE",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

export default function ChildOverview({
  memberId,
  displayName,
  emoji = "👶",
}: ChildOverviewProps) {
  const [
    child,
    setChild,
  ] =
    useState<
      ChildData | null
    >(null);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<
      string | null
    >(null);

  const [
    now,
    setNow,
  ] =
    useState(
      () => new Date()
    );

  const loadChild =
    useCallback(async () => {
      setIsLoading(true);
      setErrorMessage(null);

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "family_members"
          )
          .select(
            "id, display_name, emoji, birthday"
          )
          .eq(
            "id",
            memberId
          )
          .single();

      if (error) {
        console.error(
          `Kunde inte hämta ${displayName}:`,
          error
        );

        setErrorMessage(
          "Barnets uppgifter kunde inte hämtas."
        );

        setIsLoading(false);
        return;
      }

      setChild(
        data as ChildData
      );

      setIsLoading(false);
    }, [
      memberId,
      displayName,
    ]);

  useEffect(() => {
    void loadChild();

    function handleFamilyDataChanged() {
      void loadChild();
    }

    window.addEventListener(
      "family-data-changed",
      handleFamilyDataChanged
    );

    return () => {
      window.removeEventListener(
        "family-data-changed",
        handleFamilyDataChanged
      );
    };
  }, [loadChild]);

  useEffect(() => {
    const intervalId =
      window.setInterval(
        () => {
          setNow(
            new Date()
          );
        },
        60 * 60 * 1000
      );

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, []);

  const age =
    useMemo(
      () =>
        child
          ? getCalendarAge(
              child.birthday,
              now
            )
          : null,
      [
        child,
        now,
      ]
    );

  if (isLoading) {
    return (
      <section className="relative overflow-hidden rounded-[2rem] border border-amber-300/15 bg-gradient-to-br from-slate-950 via-amber-950/35 to-rose-950/20 p-6 shadow-2xl shadow-amber-950/20">
        <div className="flex min-h-48 flex-col items-center justify-center gap-3">
          <LoaderCircle
            size={32}
            className="animate-spin text-amber-300"
          />

          <p className="text-sm text-slate-400">
            Hämtar {displayName}s uppgifter…
          </p>
        </div>
      </section>
    );
  }

  if (
    errorMessage ||
    !child ||
    !age
  ) {
    return (
      <section className="rounded-[2rem] border border-red-300/15 bg-slate-950/70 p-6">
        <div className="flex min-h-44 flex-col items-center justify-center text-center">
          <Baby
            size={36}
            className="text-rose-300"
          />

          <p className="mt-4 font-semibold text-white">
            {displayName} kunde inte laddas
          </p>

          <p className="mt-2 text-sm text-slate-400">
            {errorMessage}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-amber-300/15 bg-gradient-to-br from-slate-950 via-amber-950/35 to-rose-950/25 p-5 shadow-2xl shadow-amber-950/20 sm:p-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-rose-400/[0.08] blur-3xl" />
      </div>

      <div className="relative">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-amber-200/20 bg-amber-400/10 text-4xl shadow-lg shadow-amber-950/20">
            {child.emoji ||
              emoji}
          </div>

          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
              <Sparkles
                size={15}
              />

              Familjen
            </p>

            <h2 className="mt-1 text-3xl font-black text-white sm:text-4xl">
              {
                child.display_name
              }
            </h2>

            <p className="mt-2 text-lg font-semibold text-amber-100">
              {getAgeTitle(
                age
              )}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
            <div className="flex items-center gap-2 text-amber-300">
              <CalendarDays
                size={17}
              />

              <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                Dagar gammal
              </p>
            </div>

            <p className="mt-2 text-2xl font-bold text-white">
              {new Intl.NumberFormat(
                "sv-SE"
              ).format(
                age.totalDays
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
            <div className="flex items-center gap-2 text-rose-300">
              <Cake
                size={17}
              />

              <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                Född
              </p>
            </div>

            <p className="mt-2 text-lg font-bold capitalize text-white">
              {formatBirthday(
                child.birthday
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
            <div className="flex items-center gap-2 text-blue-300">
              <Baby
                size={17}
              />

              <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                Ålder
              </p>
            </div>

            <p className="mt-2 text-lg font-bold text-white">
              {getAgeTitle(
                age
              )}
            </p>
          </div>
        </div>

        <p className="mt-5 border-t border-white/10 pt-4 text-xs text-slate-500">
          Födelsedatumet hämtas från familjedatabasen och uppdateras automatiskt om det ändras under Administrera personer.
        </p>
      </div>
    </section>
  );
}