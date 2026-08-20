"use client";

import {
  Activity,
  AlertTriangle,
  Clock3,
  ExternalLink,
  Flame,
  Globe2,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Ruler,
  Waves,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";

type EarthquakeItem = {
  id: string;
  magnitude: number;
  place: string;
  time: string;
  depthKm: number;
  latitude: number;
  longitude: number;
  url: string;
  tsunami: boolean;
  alert: string | null;
  significance: number | null;
  feltReports: number | null;
};

type EarthData = {
  generatedAt: string;
  source: string;
  periodHours: number;
  summary: {
    totalEarthquakes: number;
    magnitude4: number;
    magnitude5: number;
    magnitude6: number;
    largest: EarthquakeItem | null;
    latestM4: EarthquakeItem | null;
    activityLevel: "Lugn" | "Normal" | "Förhöjd" | "Kraftig";
  };
  earthquakes: EarthquakeItem[];
};

type VolcanoItem = {
  name: string;
  country: string;
  eruptionStart: string;
  lastKnownActivity: string;
  eruptionType: string;
  url: string;
  distanceKm: number;
};

type VolcanoData = {
  generatedAt: string;
  source: string;
  sourceUrl: string;
  statusDate: string | null;
  total: number;
  volcanoes: VolcanoItem[];
};

function formatMagnitude(value: number): string {
  return value.toFixed(1);
}

function formatEventTime(value: string): string {
  return new Date(value).toLocaleString("sv-SE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTimeAgo(value: string): string {
  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return "Okänd tid";
  }

  const minutes = Math.floor(Math.max(0, Date.now() - timestamp) / 60000);

  if (minutes < 1) return "Nyss";
  if (minutes < 60) return `${minutes} min sedan`;

  const hours = Math.floor(minutes / 60);
  return `${hours} ${hours === 1 ? "timme" : "timmar"} sedan`;
}

function getMagnitudeClasses(magnitude: number): string {
  if (magnitude >= 7) return "border-red-400/30 bg-red-400/15 text-red-200";
  if (magnitude >= 6) return "border-orange-400/30 bg-orange-400/15 text-orange-200";
  if (magnitude >= 5) return "border-amber-300/25 bg-amber-300/10 text-amber-200";
  return "border-emerald-300/20 bg-emerald-400/10 text-emerald-200";
}

function getActivityClasses(level: EarthData["summary"]["activityLevel"]): string {
  switch (level) {
    case "Kraftig":
      return "border-red-400/25 bg-red-400/10 text-red-200";
    case "Förhöjd":
      return "border-orange-400/25 bg-orange-400/10 text-orange-200";
    case "Normal":
      return "border-amber-300/20 bg-amber-300/10 text-amber-200";
    default:
      return "border-emerald-300/20 bg-emerald-400/10 text-emerald-200";
  }
}

function SummaryStat({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300/80">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function EarthquakeCard({ earthquake }: { earthquake: EarthquakeItem }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.07]">
      <div className="flex items-start gap-4">
        <div
          className={[
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-xl font-black",
            getMagnitudeClasses(earthquake.magnitude),
          ].join(" ")}
        >
          {formatMagnitude(earthquake.magnitude)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold leading-6 text-white">{earthquake.place}</p>
              <p className="mt-1 text-xs text-slate-500">
                {getTimeAgo(earthquake.time)} · {formatEventTime(earthquake.time)}
              </p>
            </div>

            <a
              href={earthquake.url}
              target="_blank"
              rel="noreferrer"
              aria-label={`Öppna ${earthquake.place} hos USGS`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:border-emerald-300/20 hover:bg-emerald-400/10 hover:text-emerald-200"
            >
              <ExternalLink size={16} />
            </a>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-slate-950/25 px-3 py-2 text-xs text-slate-400">
              <Ruler size={14} className="shrink-0 text-emerald-300" />
              Djup {Math.round(earthquake.depthKm)} km
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-slate-950/25 px-3 py-2 text-xs text-slate-400">
              <MapPin size={14} className="shrink-0 text-emerald-300" />
              {earthquake.latitude.toFixed(1)}°, {earthquake.longitude.toFixed(1)}°
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-slate-950/25 px-3 py-2 text-xs text-slate-400">
              <Activity size={14} className="shrink-0 text-emerald-300" />
              Signifikans {earthquake.significance ?? "–"}
            </div>
          </div>

          {earthquake.tsunami && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-blue-300/20 bg-blue-400/10 px-3 py-2 text-xs font-semibold text-blue-200">
              <Waves size={15} />
              USGS-flödet har tsunami-flagga för händelsen
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function FunOtherDashboard() {
  const [data, setData] = useState<EarthData | null>(null);

  const [volcanoData, setVolcanoData] =
    useState<VolcanoData | null>(null);

  const [volcanoError, setVolcanoError] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [clock, setClock] = useState(0);

  const loadData =
    useCallback(async () => {
      setIsLoading(true);
      setErrorMessage(null);
      setVolcanoError(null);

      try {
        const [
          earthResponse,
          volcanoResponse,
        ] = await Promise.all([
          fetch("/api/earth", {
            cache: "no-store",
          }),
          fetch("/api/volcanoes", {
            cache: "no-store",
          }),
        ]);

        if (!earthResponse.ok) {
          throw new Error(
            `Jordbävnings-API ${earthResponse.status}`
          );
        }

        const earthResult =
          (await earthResponse.json()) as EarthData;

        setData(earthResult);

        if (volcanoResponse.ok) {
          const volcanoResult =
            (await volcanoResponse.json()) as VolcanoData;

          setVolcanoData(
            volcanoResult
          );
        } else {
          setVolcanoData(null);
          setVolcanoError(
            "Vulkandata kunde inte hämtas just nu."
          );
        }
      } catch (error) {
        console.error(
          "Kunde inte hämta jorddata:",
          error
        );

        setErrorMessage(
          "Jorddata kunde inte hämtas just nu."
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadData();

    const intervalId = window.setInterval(() => {
      void loadData();
    }, 5 * 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, [loadData]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setClock((value) => value + 1);
    }, 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const earthquakes = useMemo(
    () => data?.earthquakes ?? [],
    [data, clock]
  );

  if (isLoading) {
    return (
      <section className="relative overflow-hidden rounded-[2rem] border border-emerald-300/10 bg-gradient-to-br from-slate-950 via-emerald-950/45 to-slate-950 p-6 shadow-2xl shadow-emerald-950/20">
        <div className="flex min-h-[28rem] flex-col items-center justify-center gap-4">
          <LoaderCircle size={38} className="animate-spin text-emerald-300" />
          <p className="text-slate-300">Lyssnar på jordskorpan…</p>
        </div>
      </section>
    );
  }

  if (!data || errorMessage) {
    return (
      <section className="rounded-[2rem] border border-red-300/15 bg-slate-950/70 p-6">
        <div className="flex min-h-72 flex-col items-center justify-center text-center">
          <AlertTriangle size={38} className="text-red-300" />
          <p className="mt-4 font-semibold text-white">Jorden kunde inte laddas</p>
          <p className="mt-2 text-sm text-slate-400">{errorMessage}</p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-500"
          >
            <RefreshCw size={17} />
            Försök igen
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-emerald-300/10 bg-gradient-to-br from-slate-950 via-emerald-950/40 to-slate-950 p-4 shadow-2xl shadow-emerald-950/20 sm:p-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-28 h-96 w-96 rounded-full bg-amber-500/[0.07] blur-3xl" />
      </div>

      <div className="relative z-10">
        <header className="mb-5 rounded-3xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
                <Globe2 size={17} />
                Earth Control
              </p>
              <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Jorden just nu</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Jordbävningar i realtid och pågående vulkanutbrott. Blixtar och oväder bygger vi in i nästa steg.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadData()}
              className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20"
            >
              <RefreshCw size={17} />
              Uppdatera
            </button>
          </div>
        </header>

        <div className="mb-5 rounded-3xl border border-emerald-300/10 bg-gradient-to-br from-emerald-400/[0.08] via-slate-950/30 to-amber-400/[0.05] p-5">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  Global seismisk aktivitet · senaste 24 timmarna
                </p>
                <h3 className="mt-2 text-2xl font-bold text-white">
                  {data.summary.largest
                    ? `Starkast: M ${formatMagnitude(data.summary.largest.magnitude)}`
                    : "Inga skalv tillgängliga"}
                </h3>
                {data.summary.largest && (
                  <p className="mt-2 max-w-2xl text-sm text-slate-400">
                    {data.summary.largest.place}
                  </p>
                )}
              </div>

              <span
                className={[
                  "rounded-full border px-3 py-1.5 text-sm font-semibold",
                  getActivityClasses(data.summary.activityLevel),
                ].join(" ")}
              >
                {data.summary.activityLevel} aktivitet
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <SummaryStat label="M4+" value={String(data.summary.magnitude4)} description="Skalv med magnitud 4,0 eller högre." />
              <SummaryStat label="M5+" value={String(data.summary.magnitude5)} description="Skalv med magnitud 5,0 eller högre." />
              <SummaryStat label="M6+" value={String(data.summary.magnitude6)} description="Kraftiga skalv senaste dygnet." />
              <SummaryStat label="Alla registrerade" value={String(data.summary.totalEarthquakes)} description="Händelser i USGS globala dygnsflöde." />
            </div>

            {data.summary.latestM4 && (
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                <Clock3 size={19} className="mt-0.5 shrink-0 text-emerald-300" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Senaste M4+</p>
                  <p className="mt-1 font-semibold text-white">
                    M {formatMagnitude(data.summary.latestM4.magnitude)} · {data.summary.latestM4.place}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{getTimeAgo(data.summary.latestM4.time)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <Card
          title="Pågående vulkanutbrott"
          icon={
            <Flame
              size={28}
            />
          }
          className="mb-5 border-orange-300/15 bg-slate-950/55 hover:bg-slate-950/70"
          storageKey="earth-volcanoes"
        >
          {volcanoError ||
          !volcanoData ? (
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
                    {volcanoError ??
                      "Försök igen om en stund."}
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
                      {volcanoData.total}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Smithsonian använder "continuing eruption" för utbrott med åtminstone intermittent eruptiv aktivitet utan ett uppehåll på tre månader eller mer.
                    </p>
                  </div>

                  <a
                    href={
                      volcanoData.sourceUrl
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-orange-300/15 bg-orange-400/10 px-3 py-2 text-sm font-semibold text-orange-200 transition hover:bg-orange-400/20"
                  >
                    Smithsonian GVP
                    <ExternalLink
                      size={15}
                    />
                  </a>
                </div>

                {volcanoData.statusDate && (
                  <p className="mt-3 text-xs text-slate-500">
                    Liststatus:{" "}
                    {volcanoData.statusDate}
                  </p>
                )}
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {volcanoData.volcanoes.map(
                  (volcano) => (
                    <article
                      key={`${volcano.name}-${volcano.country}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.07]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-300/15 bg-orange-400/10 text-orange-300">
                          <Flame
                            size={22}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-white">
                                {volcano.name}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {volcano.country} ·{" "}
                                {new Intl.NumberFormat(
                                  "sv-SE"
                                ).format(
                                  volcano.distanceKm
                                )}{" "}
                                km från Göteborg
                              </p>
                            </div>

                            <a
                              href={
                                volcano.url
                              }
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Öppna ${volcano.name} hos Smithsonian GVP`}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:border-orange-300/20 hover:bg-orange-400/10 hover:text-orange-200"
                            >
                              <ExternalLink
                                size={16}
                              />
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
                  )
                )}
              </div>

              <p className="mt-4 border-t border-white/10 pt-4 text-xs leading-5 text-slate-500">
                Smithsonian påpekar att listan över fortsatta utbrott uppdateras i större omgångar, medan Weekly Volcanic Activity Report innehåller nyare aktivitet mellan databasuppdateringarna.
              </p>
            </>
          )}
        </Card>

        <Card
          title="Jordbävningar"
          icon={<Activity size={28} />}
          className="border-emerald-300/15 bg-slate-950/55 hover:bg-slate-950/70"
          storageKey="earth-earthquakes"
        >
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-semibold text-white">De starkaste M4+ senaste 24 timmarna</p>
              <p className="mt-1 text-xs text-slate-500">Listan sorteras efter magnitud och uppdateras automatiskt.</p>
            </div>
            <p className="text-xs text-slate-500">Källa: {data.source}</p>
          </div>

          {earthquakes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
              <Globe2 size={32} className="mx-auto text-emerald-300" />
              <p className="mt-3 font-semibold text-white">Inga M4+ hittades</p>
              <p className="mt-1 text-sm text-slate-400">Det finns inga sådana händelser i det aktuella dygnsflödet.</p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {earthquakes.map((earthquake) => (
                <EarthquakeCard key={earthquake.id} earthquake={earthquake} />
              ))}
            </div>
          )}

          <p className="mt-4 border-t border-white/10 pt-4 text-xs text-slate-500">
            USGS realtidsflöden uppdateras löpande. Magnitud, plats och djup kan justeras när fler mätningar analyseras.
          </p>
        </Card>

        <p className="mt-5 text-center text-xs text-slate-500">
          USGS-data senast genererad{" "}
          {new Date(data.generatedAt).toLocaleTimeString("sv-SE", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </section>
  );
}