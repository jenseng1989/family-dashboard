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
  useState,
} from "react";

import Card from "@/components/ui/Card";
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

type AgeDetails = {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  nextAge: number;
  daysUntilBirthday: number;
  nextBirthday: Date;
};

function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  return new Date(year, month - 1, day);
}

function startOfToday(): Date {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
}

function daysBetween(
  firstDate: Date,
  secondDate: Date
): number {
  const firstUtc = Date.UTC(
    firstDate.getFullYear(),
    firstDate.getMonth(),
    firstDate.getDate()
  );

  const secondUtc = Date.UTC(
    secondDate.getFullYear(),
    secondDate.getMonth(),
    secondDate.getDate()
  );

  return Math.max(
    0,
    Math.round(
      (secondUtc - firstUtc) / 86_400_000
    )
  );
}

function formatBirthday(dateString: string): string {
  return parseLocalDate(
    dateString
  ).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatNextBirthday(date: Date): string {
  return date.toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getAgeDetails(
  birthdayString: string
): AgeDetails {
  const birthday = parseLocalDate(
    birthdayString
  );
  const today = startOfToday();

  let years =
    today.getFullYear() -
    birthday.getFullYear();

  let yearAnchor = new Date(
    birthday.getFullYear() + years,
    birthday.getMonth(),
    birthday.getDate()
  );

  if (yearAnchor > today) {
    years -= 1;
    yearAnchor = new Date(
      birthday.getFullYear() + years,
      birthday.getMonth(),
      birthday.getDate()
    );
  }

  let months =
    (today.getFullYear() -
      yearAnchor.getFullYear()) *
      12 +
    today.getMonth() -
    yearAnchor.getMonth();

  let monthAnchor = new Date(
    yearAnchor.getFullYear(),
    yearAnchor.getMonth() + months,
    yearAnchor.getDate()
  );

  if (monthAnchor > today) {
    months -= 1;
    monthAnchor = new Date(
      yearAnchor.getFullYear(),
      yearAnchor.getMonth() + months,
      yearAnchor.getDate()
    );
  }

  const days = daysBetween(
    monthAnchor,
    today
  );

  let nextBirthday = new Date(
    today.getFullYear(),
    birthday.getMonth(),
    birthday.getDate()
  );

  if (nextBirthday < today) {
    nextBirthday = new Date(
      today.getFullYear() + 1,
      birthday.getMonth(),
      birthday.getDate()
    );
  }

  const daysUntilBirthday = daysBetween(
    today,
    nextBirthday
  );

  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days,
    totalDays: daysBetween(
      birthday,
      today
    ),
    nextAge:
      nextBirthday.getFullYear() -
      birthday.getFullYear(),
    daysUntilBirthday,
    nextBirthday,
  };
}

function formatAge(age: AgeDetails): string {
  const parts: string[] = [];

  if (age.years > 0) {
    parts.push(
      `${age.years} ${
        age.years === 1 ? "år" : "år"
      }`
    );
  }

  if (age.months > 0) {
    parts.push(
      `${age.months} ${
        age.months === 1
          ? "månad"
          : "månader"
      }`
    );
  }

  if (
    age.days > 0 ||
    parts.length === 0
  ) {
    parts.push(
      `${age.days} ${
        age.days === 1 ? "dag" : "dagar"
      }`
    );
  }

  return parts.join(" och ");
}

export default function ChildOverview({
  memberId,
  displayName,
  emoji = "👶",
}: ChildOverviewProps) {
  const [child, setChild] =
    useState<ChildData | null>(null);
  const [isLoading, setIsLoading] =
    useState(true);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const loadChild = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("family_members")
      .select(
        "id, display_name, emoji, birthday"
      )
      .eq("id", memberId)
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

    setChild(data as ChildData);
    setIsLoading(false);
  }, [memberId, displayName]);

  useEffect(() => {
    void loadChild();
  }, [loadChild]);

  if (isLoading) {
    return (
      <Card
        title={displayName}
        icon={<Baby size={28} />}
        storageKey={`child-${memberId}-overview`}
      >
        <div className="flex min-h-56 items-center justify-center">
          <LoaderCircle
            size={28}
            className="animate-spin text-blue-300"
          />
        </div>
      </Card>
    );
  }

  if (errorMessage || !child) {
    return (
      <Card
        title={displayName}
        icon={<Baby size={28} />}
        storageKey={`child-${memberId}-overview`}
      >
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
          {errorMessage ??
            "Barnets uppgifter kunde inte hämtas."}
        </div>
      </Card>
    );
  }

  const age = getAgeDetails(
    child.birthday
  );

  return (
    <Card
      title={child.display_name}
      icon={
        <span className="text-2xl">
          {child.emoji || emoji}
        </span>
      }
      storageKey={`child-${memberId}-overview`}
    >
      <div className="grid gap-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-amber-300">
              <Sparkles size={16} />

              <p className="text-xs font-bold uppercase tracking-[0.18em]">
                Familjen
              </p>
            </div>

            <p className="mt-3 text-xl font-bold text-amber-100 sm:text-2xl">
              {formatAge(age)}
            </p>
          </div>

          <div className="rounded-2xl border border-rose-300/20 bg-rose-400/[0.08] p-4 lg:min-w-[255px]">
            <div className="flex items-center gap-2 text-rose-300">
              <Cake size={17} />

              <p className="text-xs font-bold uppercase tracking-[0.14em]">
                Nästa födelsedag
              </p>
            </div>

            <p className="mt-3 text-lg font-bold text-white">
              {age.daysUntilBirthday === 0
                ? `Fyller ${age.nextAge} år idag`
                : `${age.daysUntilBirthday} dagar till ${age.nextAge}-årsdagen`}
            </p>

            <p className="mt-1 text-sm capitalize text-slate-400">
              {formatNextBirthday(
                age.nextBirthday
              )}
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-amber-300/15 bg-amber-400/[0.05] p-4">
            <div className="flex items-center gap-2 text-amber-300">
              <CalendarDays size={17} />

              <p className="text-xs font-bold uppercase tracking-[0.14em]">
                Dagar gammal
              </p>
            </div>

            <p className="mt-3 text-2xl font-black text-white">
              {age.totalDays.toLocaleString(
                "sv-SE"
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-rose-300/15 bg-rose-400/[0.05] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-rose-300">
              Född
            </p>

            <p className="mt-3 text-lg font-bold capitalize text-white">
              {formatBirthday(
                child.birthday
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-violet-300/15 bg-violet-400/[0.05] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-300">
              Nästa ålder
            </p>

            <p className="mt-3 text-2xl font-black text-white">
              {age.nextAge} år
            </p>

            <p className="mt-1 text-sm text-slate-400">
              {age.daysUntilBirthday === 0
                ? "idag"
                : `om ${age.daysUntilBirthday} dagar`}
            </p>
          </div>
        </div>

        <p className="border-t border-white/10 pt-4 text-xs leading-5 text-slate-500">
          Födelsedatumet hämtas från familjedatabasen och uppdateras automatiskt om det ändras under Administrera personer.
        </p>
      </div>
    </Card>
  );
}
