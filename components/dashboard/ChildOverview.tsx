"use client";

import {
  Baby,
  Cake,
  FileText,
  LoaderCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import ChildDocumentationButton from "@/components/dashboard/ChildDocumentationButton";
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

function formatBirthday(
  dateString: string
): string {
  return parseLocalDate(
    dateString
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
  );
}

function getAge(
  birthdayString: string
): {
  months: number;
  days: number;
} {
  const birthday =
    parseLocalDate(
      birthdayString
    );

  const today =
    new Date();

  const currentDate =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

  let months =
    (
      currentDate.getFullYear() -
      birthday.getFullYear()
    ) *
      12 +
    currentDate.getMonth() -
    birthday.getMonth();

  let monthAnchor =
    new Date(
      birthday.getFullYear(),
      birthday.getMonth() +
        months,
      birthday.getDate()
    );

  if (
    monthAnchor >
    currentDate
  ) {
    months -= 1;

    monthAnchor =
      new Date(
        birthday.getFullYear(),
        birthday.getMonth() +
          months,
        birthday.getDate()
      );
  }

  const anchorUtc =
    Date.UTC(
      monthAnchor.getFullYear(),
      monthAnchor.getMonth(),
      monthAnchor.getDate()
    );

  const todayUtc =
    Date.UTC(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate()
    );

  const days =
    Math.max(
      0,
      Math.round(
        (
          todayUtc -
          anchorUtc
        ) /
          86_400_000
      )
    );

  return {
    months:
      Math.max(
        0,
        months
      ),
    days,
  };
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

  const loadChild =
    useCallback(
      async () => {
        setIsLoading(
          true
        );

        setErrorMessage(
          null
        );

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

          setIsLoading(
            false
          );

          return;
        }

        setChild(
          data as ChildData
        );

        setIsLoading(
          false
        );
      },
      [
        memberId,
        displayName,
      ]
    );

  useEffect(() => {
    void loadChild();
  }, [
    loadChild,
  ]);

  if (
    isLoading
  ) {
    return (
      <Card
        title={
          displayName
        }
        icon={
          <Baby
            size={28}
          />
        }
        storageKey={`child-${memberId}-overview`}
      >
        <div className="flex min-h-36 items-center justify-center">
          <LoaderCircle
            size={28}
            className="animate-spin text-blue-300"
          />
        </div>
      </Card>
    );
  }

  if (
    errorMessage ||
    !child
  ) {
    return (
      <Card
        title={
          displayName
        }
        icon={
          <Baby
            size={28}
          />
        }
        storageKey={`child-${memberId}-overview`}
      >
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
          {errorMessage ??
            "Barnets uppgifter kunde inte hämtas."}
        </div>
      </Card>
    );
  }

  const age =
    getAge(
      child.birthday
    );

  return (
    <Card
      title={
        child.display_name
      }
      icon={
        <span className="text-2xl">
          {child.emoji ||
            emoji}
        </span>
      }
      storageKey={`child-${memberId}-overview`}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-blue-300/15 bg-blue-400/[0.06] p-4">
          <div className="flex items-center gap-2 text-blue-300">
            <Baby
              size={18}
            />

            <p className="text-xs font-semibold uppercase tracking-[0.14em]">
              Ålder
            </p>
          </div>

          <p className="mt-3 text-2xl font-black text-white">
            {
              age.months
            }{" "}
            mån
            {age.days >
            0
              ? `, ${age.days} dagar`
              : ""}
          </p>
        </div>

        <div className="rounded-2xl border border-rose-300/15 bg-rose-400/[0.06] p-4">
          <div className="flex items-center gap-2 text-rose-300">
            <Cake
              size={18}
            />

            <p className="text-xs font-semibold uppercase tracking-[0.14em]">
              Född
            </p>
          </div>

          <p className="mt-3 text-lg font-bold capitalize text-white">
            {formatBirthday(
              child.birthday
            )}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-blue-300/10 bg-gradient-to-br from-blue-400/[0.08] via-white/[0.03] to-violet-400/[0.06] p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-300/15 bg-blue-400/10 text-blue-300">
              <FileText
                size={20}
              />
            </div>

            <div>
              <p className="font-semibold text-white">
                Barnets dokumentation
              </p>

              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-400">
                Skapa en PDF med tillväxt, vikt- och längdkurvor, tänder, vaccinationer och historik.
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <ChildDocumentationButton
              memberId={
                memberId
              }
              displayName={
                child.display_name
              }
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
