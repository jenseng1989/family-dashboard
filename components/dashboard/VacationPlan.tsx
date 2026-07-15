"use client";

import {
  BedDouble,
  CalendarDays,
  ExternalLink,
  Info,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Route,
  Sparkles,
  Umbrella,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";

type VacationDay = {
  id: string;
  plan_date: string;
  day_name: string | null;
  location: string | null;
  travel: string | null;
  accommodation: string | null;
  activity: string | null;
  information: string | null;
};

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(dateString: string): string {
  return parseLocalDate(dateString).toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatShortDate(dateString: string): string {
  return parseLocalDate(dateString).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
  });
}

function createMapsUrl(accommodation: string, location: string | null): string {
  const query = location
    ? `${accommodation}, ${location}`
    : accommodation;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function hasVisibleInformation(day: VacationDay): boolean {
  return Boolean(
    day.location ||
      day.travel ||
      day.accommodation ||
      day.activity ||
      day.information
  );
}

export default function VacationPlan() {
  const [days, setDays] = useState<VacationDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPlan = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("vacation_plan")
      .select(
        "id, plan_date, day_name, location, travel, accommodation, activity, information"
      )
      .order("plan_date", { ascending: true });

    if (error) {
      console.error("Kunde inte hämta semesterplaneringen:", error);
      setErrorMessage("Kunde inte hämta semesterplaneringen.");
      setIsLoading(false);
      return;
    }

    setDays((data ?? []).filter(hasVisibleInformation));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  const today = getTodayString();

  const { featuredDay, remainingDays, featuredLabel } = useMemo(() => {
    const todaysDay = days.find((day) => day.plan_date === today);

    if (todaysDay) {
      return {
        featuredDay: todaysDay,
        remainingDays: days.filter((day) => day.plan_date > today),
        featuredLabel: "Dagens plan",
      };
    }

    const nextDay = days.find((day) => day.plan_date > today);

    if (nextDay) {
      return {
        featuredDay: nextDay,
        remainingDays: days.filter(
          (day) => day.plan_date > nextDay.plan_date
        ),
        featuredLabel: "Nästa planerade dag",
      };
    }

    return {
      featuredDay: null,
      remainingDays: [],
      featuredLabel: "Semesterplanering",
    };
  }, [days, today]);

  if (isLoading) {
    return (
      <Card title="Semesterplanering" icon={<Umbrella size={28} />}>
        <div className="flex min-h-52 flex-col items-center justify-center gap-3">
          <LoaderCircle
            size={32}
            className="animate-spin text-blue-300"
          />
          <p className="text-sm text-slate-400">
            Hämtar semesterplaneringen…
          </p>
        </div>
      </Card>
    );
  }

  if (errorMessage) {
    return (
      <Card title="Semesterplanering" icon={<Umbrella size={28} />}>
        <div className="flex min-h-52 flex-col items-center justify-center text-center">
          <p className="font-semibold text-white">
            Semesterplaneringen kunde inte hämtas
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={() => void loadPlan()}
            className="mt-5 flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400"
          >
            <RefreshCw size={17} />
            Försök igen
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Semesterplanering" icon={<Umbrella size={28} />}>
      {featuredDay ? (
        <section className="rounded-2xl border border-blue-300/20 bg-blue-400/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
                {featuredLabel}
              </p>
              <h3 className="mt-1 text-2xl font-bold capitalize text-white">
                {formatDate(featuredDay.plan_date)}
              </h3>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
              <Sparkles size={24} />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {featuredDay.location && (
              <div className="rounded-xl bg-slate-950/25 p-4">
                <p className="flex items-center gap-2 text-sm text-slate-400">
                  <MapPin size={16} />
                  Plats
                </p>
                <p className="mt-2 font-semibold text-white">
                  {featuredDay.location}
                </p>
              </div>
            )}

            {featuredDay.accommodation && (
              <div className="rounded-xl bg-slate-950/25 p-4">
                <p className="flex items-center gap-2 text-sm text-slate-400">
                  <BedDouble size={16} />
                  Boende
                </p>
                <a
                  href={createMapsUrl(
                    featuredDay.accommodation,
                    featuredDay.location
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 font-semibold text-blue-300 transition hover:text-blue-200"
                >
                  {featuredDay.accommodation}
                  <ExternalLink size={15} />
                </a>
              </div>
            )}

            {featuredDay.activity && (
              <div className="rounded-xl bg-slate-950/25 p-4">
                <p className="flex items-center gap-2 text-sm text-slate-400">
                  <CalendarDays size={16} />
                  Aktivitet
                </p>
                <p className="mt-2 font-semibold text-white">
                  {featuredDay.activity}
                </p>
              </div>
            )}

            {featuredDay.travel && (
              <div className="rounded-xl bg-slate-950/25 p-4">
                <p className="flex items-center gap-2 text-sm text-slate-400">
                  <Route size={16} />
                  Resa
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-white">
                  {featuredDay.travel}
                </p>
              </div>
            )}
          </div>

          {featuredDay.information && (
            <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-400/10 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-amber-200">
                <Info size={16} />
                {featuredDay.information}
              </p>
            </div>
          )}
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
          <Umbrella size={36} className="mx-auto text-blue-300" />
          <p className="mt-3 font-semibold text-white">
            Semesterplaneringen är avslutad
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Det finns inga kommande planerade dagar.
          </p>
        </div>
      )}

      {remainingDays.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
            Resterande dagar
          </h3>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-[900px] w-full border-collapse text-left text-sm">
              <thead className="bg-white/10 text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-semibold">Datum</th>
                  <th className="px-4 py-3 font-semibold">Plats</th>
                  <th className="px-4 py-3 font-semibold">Boende</th>
                  <th className="px-4 py-3 font-semibold">Aktivitet</th>
                  <th className="px-4 py-3 font-semibold">Resa</th>
                  <th className="px-4 py-3 font-semibold">Information</th>
                </tr>
              </thead>

              <tbody>
                {remainingDays.map((day) => (
                  <tr
                    key={day.id}
                    className="border-t border-white/10 align-top transition hover:bg-white/5"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <p className="font-semibold capitalize text-white">
                        {day.day_name ?? ""}
                      </p>
                      <p className="mt-1 text-slate-400">
                        {formatShortDate(day.plan_date)}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-slate-300">
                      {day.location || "–"}
                    </td>

                    <td className="px-4 py-3">
                      {day.accommodation ? (
                        <a
                          href={createMapsUrl(
                            day.accommodation,
                            day.location
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 font-medium text-blue-300 transition hover:text-blue-200"
                        >
                          {day.accommodation}
                          <ExternalLink size={14} />
                        </a>
                      ) : (
                        <span className="text-slate-500">–</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-300">
                      {day.activity || "–"}
                    </td>

                    <td className="max-w-xs whitespace-pre-line px-4 py-3 text-slate-300">
                      {day.travel || "–"}
                    </td>

                    <td className="max-w-xs px-4 py-3 text-slate-300">
                      {day.information || "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </Card>
  );
}