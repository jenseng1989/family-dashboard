"use client";

import {
  CalendarDays,
  Gauge,
  Orbit,
  Sparkles,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Card from "@/components/ui/Card";
import {
  formatMeteorDate,
  getMeteorShowerOverview,
  type MeteorShowerOccurrence,
} from "@/lib/meteor-showers";

function getPeakText(
  shower: MeteorShowerOccurrence
): string {
  if (shower.daysUntilPeak === 0) {
    return "Maximum idag";
  }

  if (shower.daysUntilPeak === 1) {
    return "Maximum imorgon";
  }

  if (shower.daysUntilPeak > 1) {
    return `Maximum om ${shower.daysUntilPeak} dagar`;
  }

  if (shower.daysSincePeak === 1) {
    return "Maximum var igår";
  }

  return `Maximum var för ${shower.daysSincePeak} dagar sedan`;
}

function ActiveShowerCard({
  shower,
}: {
  shower: MeteorShowerOccurrence;
}) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-emerald-300/20 bg-gradient-to-br from-emerald-400/10 via-violet-400/[0.05] to-transparent p-5">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="text-4xl">
              {shower.emoji}
            </span>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.17em] text-emerald-300">
                Aktivt nu
              </p>

              <h3 className="mt-1 text-2xl font-bold text-white">
                {shower.name}
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                Radiant: {shower.radiant}
              </p>
            </div>
          </div>

          <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">
            {getPeakText(shower)}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
            <p className="text-xs text-slate-500">
              Aktivitetsperiod
            </p>

            <p className="mt-1 text-sm font-semibold text-white">
              {formatMeteorDate(
                shower.startDate
              )}{" "}
              –{" "}
              {formatMeteorDate(
                shower.endDate
              )}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
            <p className="text-xs text-slate-500">
              Typisk max-ZHR
            </p>

            <p className="mt-1 text-sm font-semibold text-white">
              ~{shower.typicalZhr}/h
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
            <p className="text-xs text-slate-500">
              Hastighet
            </p>

            <p className="mt-1 text-sm font-semibold text-white">
              {shower.speedKmS} km/s
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-400">
          {shower.note}
        </p>

        <p className="mt-2 text-xs text-slate-500">
          Ursprung: {shower.parentBody}
        </p>
      </div>
    </article>
  );
}

export default function MeteorShowersWidget() {
  const [now, setNow] =
    useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());

    const intervalId =
      window.setInterval(
        () => {
          setNow(new Date());
        },
        60 * 60 * 1000
      );

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, []);

  const overview =
    useMemo(
      () =>
        now
          ? getMeteorShowerOverview(
              now
            )
          : null,
      [now]
    );

  const upcoming =
    overview?.upcoming.slice(0, 4) ?? [];

  const primaryActive =
    overview?.active[0] ?? null;

  return (
    <Card
      title="Meteorregn"
      icon={<Sparkles size={28} />}
      className="border-fuchsia-300/15 bg-slate-950/55 hover:bg-slate-950/70"
      storageKey="space-meteor-showers"
    >
      {!overview ? (
        <div className="flex min-h-40 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
          <p className="text-sm text-slate-400">
            Beräknar årets meteorregn…
          </p>
        </div>
      ) : (
        <>
          <div className="mb-5 rounded-2xl border border-fuchsia-300/10 bg-gradient-to-r from-fuchsia-400/[0.08] via-violet-400/[0.06] to-blue-400/[0.06] p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-fuchsia-400/10 text-fuchsia-300">
                <Sparkles size={25} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-300">
                  Meteorläge
                </p>

                <h3 className="mt-1 text-xl font-bold text-white">
                  {primaryActive
                    ? `${primaryActive.name} är aktivt`
                    : overview.next
                      ? `Nästa: ${overview.next.name}`
                      : "Inget större meteorregn nära"}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {primaryActive
                    ? overview.active.length > 1
                      ? `${overview.active.length} större meteorregn är aktiva just nu.`
                      : "Ett större meteorregn är aktivt just nu."
                    : overview.next
                      ? `Aktiviteten börjar om ${overview.next.daysUntilStart} dagar.`
                      : "Ingen kommande aktivitet hittades."}
                </p>
              </div>
            </div>
          </div>

          {overview.active.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {overview.active.map(
                (shower) => (
                  <ActiveShowerCard
                    key={`${shower.id}-${shower.peakDate}`}
                    shower={shower}
                  />
                )
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5">
              <p className="font-semibold text-white">
                Inget större meteorregn är aktivt idag
              </p>

              {overview.next && (
                <p className="mt-2 text-sm text-slate-400">
                  {overview.next.name} börjar{" "}
                  {formatMeteorDate(
                    overview.next.startDate
                  )}{" "}
                  och når sitt typiska maximum{" "}
                  {formatMeteorDate(
                    overview.next.peakDate
                  )}
                  .
                </p>
              )}
            </div>
          )}

          <div className="mt-6">
            <div className="flex items-center gap-2">
              <CalendarDays
                size={18}
                className="text-violet-300"
              />

              <h3 className="font-semibold text-white">
                Kommande meteorregn
              </h3>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {upcoming.map(
                (shower) => (
                  <article
                    key={`${shower.id}-${shower.peakDate}`}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-2xl">
                        {shower.emoji}
                      </span>

                      <span className="rounded-full border border-violet-300/15 bg-violet-400/10 px-2.5 py-1 text-[11px] font-semibold text-violet-200">
                        om{" "}
                        {
                          shower.daysUntilStart
                        }{" "}
                        dagar
                      </span>
                    </div>

                    <p className="mt-3 font-semibold text-white">
                      {shower.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Maximum{" "}
                      {formatMeteorDate(
                        shower.peakDate
                      )}
                    </p>

                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                      <Gauge size={14} />

                      <span>
                        ~
                        {
                          shower.typicalZhr
                        }
                        /h max-ZHR
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                      <Orbit size={14} />

                      <span className="truncate">
                        {
                          shower.parentBody
                        }
                      </span>
                    </div>
                  </article>
                )
              )}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
            <p className="text-xs leading-5 text-slate-500">
              ZHR är den teoretiska timfrekvensen under mycket
              mörk himmel med radianten nära zenit. Det faktiska
              antalet meteorer som syns från Göteborg kan vara
              betydligt lägre beroende på moln, månsken,
              ljusföroreningar och radiantens höjd.
            </p>
          </div>
        </>
      )}
    </Card>
  );
}