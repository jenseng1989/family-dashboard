"use client";

import {
  AlertTriangle,
  ExternalLink,
  Flame,
} from "lucide-react";

import Card from "@/components/ui/Card";
import type {
  VolcanoData,
} from "@/lib/earth-dashboard-types";

type Props = {
  data: VolcanoData | null;
  error: string | null;
};

export default function EarthVolcanoesWidget({
  data,
  error,
}: Props) {
  return (
    <Card
      title="Pågående vulkanutbrott"
      icon={<Flame size={28} />}
      className="h-full border-orange-300/15 bg-slate-950/55 hover:bg-slate-950/70"
      storageKey="earth-volcanoes"
    >
      {error || !data ? (
        <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={20}
              className="mt-0.5 shrink-0 text-amber-300"
            />

            <div>
              <p className="font-semibold text-amber-100">
                Vulkandata är tillfälligt otillgänglig
              </p>

              <p className="mt-1 text-sm text-amber-100/70">
                {error ?? "Försök igen om en stund."}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 rounded-2xl border border-orange-300/10 bg-orange-400/[0.06] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-300">
                  Fortsatta utbrott
                </p>

                <p className="mt-1 text-3xl font-bold text-white">
                  {data.total}
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Smithsonian använder "continuing eruption" för utbrott med åtminstone intermittent eruptiv aktivitet utan ett uppehåll på tre månader eller mer.
                </p>
              </div>

              <a
                href={data.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-orange-300/15 bg-orange-400/10 px-3 py-2 text-sm font-semibold text-orange-200 transition hover:bg-orange-400/20"
              >
                Smithsonian GVP
                <ExternalLink size={15} />
              </a>
            </div>

            {data.statusDate && (
              <p className="mt-3 text-xs text-slate-500">
                Liststatus: {data.statusDate}
              </p>
            )}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {data.volcanoes.map((volcano) => (
              <article
                key={`${volcano.name}-${volcano.country}`}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.07]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-300/15 bg-orange-400/10 text-orange-300">
                    <Flame size={22} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-white">
                          {volcano.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {volcano.country} ·{" "}
                          {new Intl.NumberFormat("sv-SE").format(
                            volcano.distanceKm
                          )}{" "}
                          km från Göteborg
                        </p>
                      </div>

                      <a
                        href={volcano.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Öppna ${volcano.name} hos Smithsonian GVP`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:border-orange-300/20 hover:bg-orange-400/10 hover:text-orange-200"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl border border-white/5 bg-slate-950/25 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                          Start
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-300">
                          {volcano.eruptionStart}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/5 bg-slate-950/25 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                          Senast känd aktivitet
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-300">
                          {volcano.lastKnownActivity}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-orange-200/80">
                      {volcano.eruptionType}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <p className="mt-4 border-t border-white/10 pt-4 text-xs leading-5 text-slate-500">
            Smithsonian påpekar att listan över fortsatta utbrott uppdateras i större omgångar, medan Weekly Volcanic Activity Report innehåller nyare aktivitet mellan databasuppdateringarna.
          </p>
        </>
      )}
    </Card>
  );
}
