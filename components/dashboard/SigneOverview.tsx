"use client";

import {
  Baby,
  Cake,
  CalendarDays,
  LoaderCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getFamilyMembersFromDatabase,
} from "@/lib/family-db";
import type {
  FamilyMember,
} from "@/lib/family";

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
    (
      endUtc -
      startUtc
    ) /
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

function getNextBirthday(
  birthdayString: string,
  referenceDate:
    Date = new Date()
): {
  date: Date;
  nextAge: number;
  daysUntil: number;
} {
  const birthday =
    parseLocalDate(
      birthdayString
    );

  const today =
    startOfDay(
      referenceDate
    );

  let nextBirthday =
    new Date(
      today.getFullYear(),
      birthday.getMonth(),
      birthday.getDate()
    );

  if (
    nextBirthday <
    today
  ) {
    nextBirthday =
      new Date(
        today.getFullYear() +
          1,
        birthday.getMonth(),
        birthday.getDate()
      );
  }

  const nextAge =
    nextBirthday.getFullYear() -
    birthday.getFullYear();

  return {
    date:
      nextBirthday,
    nextAge,
    daysUntil:
      daysBetween(
        today,
        nextBirthday
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
  const parts:
    string[] = [];

  if (
    age.years > 0
  ) {
    parts.push(
      `${age.years} ${
        age.years === 1
          ? "år"
          : "år"
      }`
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

function getBirthdayCountdownText(
  nextAge: number,
  daysUntil: number
): string {
  if (
    daysUntil === 0
  ) {
    return `Idag fyller Signe ${nextAge} år! 🎉`;
  }

  if (
    daysUntil === 1
  ) {
    return `Imorgon fyller Signe ${nextAge} år`;
  }

  return `${daysUntil} dagar till ${nextAge}-årsdagen`;
}

export default function SigneOverview() {
  const [
    signe,
    setSigne,
  ] =
    useState<
      FamilyMember | null
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

  const loadSigne =
    useCallback(async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const members =
          await getFamilyMembersFromDatabase();

        const result =
          members.find(
            (member) =>
              member.displayName
                .trim()
                .toLocaleLowerCase(
                  "sv-SE"
                ) ===
              "signe"
          ) ??
          null;

        if (!result) {
          throw new Error(
            "Signe kunde inte hittas bland familjemedlemmarna."
          );
        }

        setSigne(
          result
        );
      } catch (error) {
        console.error(
          "Kunde inte hämta Signes uppgifter:",
          error
        );

        setErrorMessage(
          "Signes uppgifter kunde inte hämtas."
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadSigne();

    function handleFamilyDataChanged() {
      void loadSigne();
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
  }, [loadSigne]);

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
        signe
          ? getCalendarAge(
              signe.birthday,
              now
            )
          : null,
      [
        signe,
        now,
      ]
    );

  const nextBirthday =
    useMemo(
      () =>
        signe
          ? getNextBirthday(
              signe.birthday,
              now
            )
          : null,
      [
        signe,
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
            Hämtar Signes uppgifter…
          </p>
        </div>
      </section>
    );
  }

  if (
    errorMessage ||
    !signe ||
    !age ||
    !nextBirthday
  ) {
    return (
      <section className="rounded-[2rem] border border-red-300/15 bg-slate-950/70 p-6">
        <div className="flex min-h-44 flex-col items-center justify-center text-center">
          <Baby
            size={36}
            className="text-rose-300"
          />

          <p className="mt-4 font-semibold text-white">
            Signe kunde inte laddas
          </p>

          <p className="mt-2 text-sm text-slate-400">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadSigne()
            }
            className="mt-5 flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-400"
          >
            <RefreshCw
              size={16}
            />

            Försök igen
          </button>
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
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-amber-200/20 bg-amber-400/10 text-4xl shadow-lg shadow-amber-950/20">
              {signe.emoji ||
                "👶"}
            </div>

            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
                <Sparkles
                  size={15}
                />

                Familjen
              </p>

              <h2 className="mt-1 text-3xl font-black text-white sm:text-4xl">
                Signe
              </h2>

              <p className="mt-2 text-lg font-semibold text-amber-100">
                {getAgeTitle(
                  age
                )}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-rose-300/15 bg-rose-400/[0.06] px-4 py-3 lg:min-w-64">
            <div className="flex items-center gap-2 text-rose-300">
              <Cake
                size={18}
              />

              <p className="text-xs font-semibold uppercase tracking-[0.15em]">
                Nästa födelsedag
              </p>
            </div>

            <p className="mt-2 font-bold text-white">
              {getBirthdayCountdownText(
                nextBirthday.nextAge,
                nextBirthday.daysUntil
              )}
            </p>

            <p className="mt-1 text-xs capitalize text-slate-500">
              {nextBirthday.date.toLocaleDateString(
                "sv-SE",
                {
                  weekday:
                    "long",
                  day:
                    "numeric",
                  month:
                    "long",
                  year:
                    "numeric",
                }
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
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-300">
              Född
            </p>

            <p className="mt-2 text-lg font-bold capitalize text-white">
              {parseLocalDate(
                signe.birthday
              ).toLocaleDateString(
                "sv-SE",
                {
                  day:
                    "numeric",
                  month:
                    "long",
                  year:
                    "numeric",
                }
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-300">
              Nästa ålder
            </p>

            <p className="mt-2 text-2xl font-bold text-white">
              {nextBirthday.nextAge} år
            </p>

            <p className="mt-1 text-xs text-slate-500">
              om{" "}
              {nextBirthday.daysUntil}{" "}
              dagar
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
