"use client";

import {
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  Satellite,
  Telescope,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import Card from "@/components/ui/Card";

type SatellitePass = {
  startUTC: number;
  maxUTC: number;
  endUTC: number;
  durationSeconds: number;
  maxElevation: number;
  startDirection: string;
  maxDirection: string;
  endDirection: string;
  magnitude: number | null;
};

type SatelliteItem = {
  id: number;
  name: string;
  apiName: string;
  emoji: string;
  description: string;
  n2yoUrl: string;
  nextPass: SatellitePass | null;
  error?: string;
};

type SatellitesResponse = {
  location: string;
  predictionDays: number;
  generatedAt: string;
  satellites: SatelliteItem[];
  error?: string;
};

function formatPassDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString(
    "sv-SE",
    {
      weekday: "short",
      day: "numeric",
      month: "short",
    }
  );
}

function formatPassTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString(
    "sv-SE",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds} sek`;
  }

  if (remainingSeconds === 0) {
    return `${minutes} min`;
  }

  return `${minutes} min ${remainingSeconds} sek`;
}

function formatMagnitude(value: number | null): string {
  return value === null ? "Okänd" : value.toFixed(1);
}

export default function SatellitesWidget() {
  const [data, setData] =
    useState<SatellitesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const loadData = useCallback(
    async (
      showLoader = true,
      forceRefresh = false
    ) => {
      if (showLoader) {
        setIsLoading(true);
      }

      setErrorMessage(null);

      try {
        const response = await fetch(
          "/api/satellites",
          forceRefresh
            ? { cache: "reload" }
            : undefined
        );

        const result =
          (await response.json()) as SatellitesResponse;

        if (!response.ok) {
          throw new Error(
            result.error ?? `API-fel ${response.status}`
          );
        }

        setData(result);
      } catch (error) {
        console.error(
          "Kunde inte hämta satellitpassager:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Satellitdata kunde inte hämtas."
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadData();

    const intervalId = window.setInterval(
      () => void loadData(false),
      30 * 60 * 1000
    );

    return () => window.clearInterval(intervalId);
  }, [loadData]);

  return (
    <Card
      title="Satelliter över Göteborg"
      icon={<Satellite size={28} />}
      className="border-cyan-300/15 bg-slate-950/55 hover:bg-slate-950/70"
      storageKey="space-satellites"
    >
      {isLoading && !data ? (
        <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03]">
          <LoaderCircle
            size={30}
            className="animate-spin text-cyan-300"
          />
          <p className="text-sm text-slate-400">
            Söker efter nästa satellitpassager…
          </p>
        </div>
      ) : errorMessage && !data ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-5">
          <p className="font-semibold text-red-200">
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={() => void loadData(true, true)}
            className="mt-4 flex items-center gap-2 rounded-xl border border-red-300/20 bg-red-300/10 px-3 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-300/20"
          >
            <RefreshCw size={16} />
            Försök igen
          </button>
        </div>
      ) : data ? (
        <>
          <div className="mb-4 rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.06] p-4">
            <div className="flex items-start gap-3">
              <Telescope
                size={20}
                className="mt-0.5 shrink-0 text-cyan-300"
              />
              <div>
                <p className="font-semibold text-white">
                  Synliga passager över {data.location}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Nästa optiskt synliga passage inom{" "}
                  {data.predictionDays} dagar.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {data.satellites.map((satellite) => (
              <article
                key={satellite.id}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.07]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-xl">
                    {satellite.emoji}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-white">
                          {satellite.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {satellite.description}
                        </p>
                      </div>

                      <a
                        href={satellite.n2yoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:border-cyan-300/20 hover:bg-cyan-400/10 hover:text-cyan-200"
                        aria-label={`Öppna ${satellite.name} på N2YO`}
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>

                    {satellite.nextPass ? (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-xl border border-white/5 bg-slate-950/30 p-3">
                          <p className="text-xs text-slate-500">
                            Nästa passage
                          </p>
                          <p className="mt-1 font-semibold capitalize text-white">
                            {formatPassDate(
                              satellite.nextPass.startUTC
                            )}{" "}
                            kl.{" "}
                            {formatPassTime(
                              satellite.nextPass.startUTC
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/5 bg-slate-950/30 p-3">
                          <p className="text-xs text-slate-500">
                            Maxhöjd
                          </p>
                          <p className="mt-1 font-semibold text-white">
                            {Math.round(
                              satellite.nextPass.maxElevation
                            )}
                            ° mot{" "}
                            {satellite.nextPass.maxDirection}
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/5 bg-slate-950/30 p-3">
                          <p className="text-xs text-slate-500">
                            Synlig tid
                          </p>
                          <p className="mt-1 font-semibold text-white">
                            {formatDuration(
                              satellite.nextPass.durationSeconds
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/5 bg-slate-950/30 p-3">
                          <p className="text-xs text-slate-500">
                            Bana över himlen
                          </p>
                          <p className="mt-1 font-semibold text-white">
                            {satellite.nextPass.startDirection}{" "}
                            →{" "}
                            {satellite.nextPass.endDirection}
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/5 bg-slate-950/30 p-3 sm:col-span-2">
                          <p className="text-xs text-slate-500">
                            Ljusstyrka
                          </p>
                          <p className="mt-1 font-semibold text-white">
                            Magnitud{" "}
                            {formatMagnitude(
                              satellite.nextPass.magnitude
                            )}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-3">
                        <p className="text-sm text-slate-400">
                          {satellite.error ??
                            `Ingen optiskt synlig passage hittades de kommande ${data.predictionDays} dagarna.`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {errorMessage && (
            <p className="mt-3 text-xs text-amber-300">
              Senaste uppdateringen misslyckades. Visar senast hämtade data.
            </p>
          )}
        </>
      ) : null}
    </Card>
  );
}
