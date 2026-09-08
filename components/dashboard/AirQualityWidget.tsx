"use client";

import {
  AlertTriangle,
  CircleHelp,
  Clock3,
  MapPin,
  RefreshCw,
  Sparkles,
  Wind,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Card from "@/components/ui/Card";

type AirQualityResponse = {
  station: string;
  aqi: number | null;
  level: {
    key: string;
    label: string;
    summary: string;
  };
  pollutants: {
    pm25: number | null;
    pm10: number | null;
    no2: number | null;
  };
  dominantPollutant: string | null;
  measuredAt: string | null;
  updatedAt: string;
  source: string;
  note: string;
};

function formatTime(
  value: string | null
): string {
  if (!value) {
    return "–";
  }

  const normalized =
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(
      value
    )
      ? value.replace(" ", "T")
      : value;

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString(
    "sv-SE",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function getLevelClasses(
  key: string
): string {
  switch (key) {
    case "good":
      return "border-emerald-300/20 bg-gradient-to-br from-emerald-400/[0.12] via-emerald-400/[0.05] to-slate-950/20";
    case "moderate":
      return "border-yellow-300/20 bg-gradient-to-br from-yellow-400/[0.12] via-yellow-400/[0.05] to-slate-950/20";
    case "sensitive":
      return "border-orange-300/20 bg-gradient-to-br from-orange-400/[0.12] via-orange-400/[0.05] to-slate-950/20";
    case "unhealthy":
      return "border-red-300/20 bg-gradient-to-br from-red-400/[0.12] via-red-400/[0.05] to-slate-950/20";
    case "very-unhealthy":
      return "border-purple-300/20 bg-gradient-to-br from-purple-400/[0.12] via-purple-400/[0.05] to-slate-950/20";
    case "hazardous":
      return "border-rose-300/20 bg-gradient-to-br from-rose-500/[0.15] via-rose-950/20 to-slate-950/20";
    default:
      return "border-white/10 bg-gradient-to-br from-white/[0.07] to-slate-950/20";
  }
}

function getLevelTextClasses(
  key: string
): string {
  switch (key) {
    case "good":
      return "text-emerald-200";
    case "moderate":
      return "text-yellow-200";
    case "sensitive":
      return "text-orange-200";
    case "unhealthy":
      return "text-red-200";
    case "very-unhealthy":
      return "text-purple-200";
    case "hazardous":
      return "text-rose-200";
    default:
      return "text-slate-200";
  }
}

function getAqiLevel(
  value: number | null
) {
  if (value === null) {
    return {
      key: "unknown",
      label: "Ingen data",
    };
  }

  if (value <= 50) {
    return {
      key: "good",
      label: "Bra",
    };
  }

  if (value <= 100) {
    return {
      key: "moderate",
      label: "Måttlig",
    };
  }

  if (value <= 150) {
    return {
      key: "sensitive",
      label: "Förhöjd",
    };
  }

  if (value <= 200) {
    return {
      key: "unhealthy",
      label: "Dålig",
    };
  }

  if (value <= 300) {
    return {
      key: "very-unhealthy",
      label: "Mycket dålig",
    };
  }

  return {
    key: "hazardous",
    label: "Extremt dålig",
  };
}

function getAqiPosition(
  aqi: number | null
): number {
  if (aqi === null) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, (aqi / 300) * 100)
  );
}

function getDominantLabel(
  pollutant: string | null
): string | null {
  if (!pollutant) {
    return null;
  }

  switch (pollutant.toLowerCase()) {
    case "pm25":
    case "pm2.5":
      return "PM2,5";
    case "pm10":
      return "PM10";
    case "no2":
      return "NO₂";
    default:
      return pollutant.toUpperCase();
  }
}

function PollutantCard({
  label,
  value,
  description,
  isDominant,
}: {
  label: string;
  value: number | null;
  description: string;
  isDominant: boolean;
}) {
  const level = getAqiLevel(value);

  return (
    <div
      className={[
        "relative overflow-hidden rounded-2xl border p-4 transition hover:bg-white/[0.08]",
        isDominant
          ? "border-blue-300/20 bg-blue-400/[0.07]"
          : "border-white/10 bg-white/[0.04]",
      ].join(" ")}
    >
      {isDominant && (
        <span className="absolute right-3 top-3 rounded-full border border-blue-300/15 bg-blue-400/[0.08] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-blue-200">
          Dominerande
        </span>
      )}

      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>

      <div className="mt-2 flex items-end gap-2">
        <p className="text-2xl font-bold text-white">
          {value ?? "–"}
        </p>

        <p className="pb-1 text-xs font-medium text-slate-500">
          AQI
        </p>
      </div>

      <p
        className={[
          "mt-1 text-xs font-semibold",
          getLevelTextClasses(level.key),
        ].join(" ")}
      >
        {level.label}
      </p>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export default function AirQualityWidget() {
  const [data, setData] =
    useState<AirQualityResponse | null>(
      null
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadData = useCallback(
    async (
      showLoader = true,
      forceRefresh = false
    ) => {
      if (showLoader) {
        setIsLoading(true);
      }

      setError(null);

      try {
        const response = await fetch(
          "/api/air-quality",
          forceRefresh
            ? {
                cache: "reload",
              }
            : undefined
        );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ??
              `API-fel ${response.status}`
          );
        }

        setData(
          result as AirQualityResponse
        );
      } catch (fetchError) {
        console.error(
          "Kunde inte hämta luftkvalitet:",
          fetchError
        );

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Luftkvaliteten kunde inte hämtas."
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadData();

    const intervalId =
      window.setInterval(
        () => void loadData(false),
        5 * 60_000
      );

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, [loadData]);

  const dominantPollutant =
    getDominantLabel(
      data?.dominantPollutant ?? null
    );

  return (
    <Card
      title="Luften"
      icon={<Wind size={28} />}
    >
      {isLoading && !data ? (
        <div className="flex min-h-52 flex-col items-center justify-center gap-3">
          <RefreshCw
            size={28}
            className="animate-spin text-emerald-300"
          />

          <p className="text-sm text-slate-400">
            Hämtar luftkvaliteten i Göteborg…
          </p>
        </div>
      ) : error && !data ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={22}
              className="mt-0.5 shrink-0 text-red-300"
            />

            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white">
                Luftkvaliteten kunde inte hämtas
              </p>

              <p className="mt-1 text-sm text-slate-300">
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  void loadData(true, true)
                }
                className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
              >
                Försök igen
              </button>
            </div>
          </div>
        </div>
      ) : data ? (
        <>
          <div
            className={[
              "overflow-hidden rounded-3xl border p-5 sm:p-6",
              getLevelClasses(
                data.level.key
              ),
            ].join(" ")}
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Luften i Göteborg
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <p
                    className={[
                      "text-3xl font-bold sm:text-4xl",
                      getLevelTextClasses(
                        data.level.key
                      ),
                    ].join(" ")}
                  >
                    {data.level.label}
                  </p>

                  {dominantPollutant && (
                    <span className="rounded-full border border-white/10 bg-slate-950/20 px-3 py-1 text-xs font-semibold text-slate-300">
                      Främst{" "}
                      {dominantPollutant}
                    </span>
                  )}
                </div>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  {data.level.summary}
                </p>
              </div>

              <div className="shrink-0 rounded-2xl border border-white/10 bg-slate-950/20 px-5 py-4 sm:text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  AQI
                </p>

                <p className="mt-1 text-4xl font-black text-white">
                  {data.aqi ?? "–"}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <div className="relative h-2 overflow-hidden rounded-full bg-gradient-to-r from-emerald-400 via-yellow-300 via-orange-400 via-red-400 to-purple-500">
                {data.aqi !== null && (
                  <span
                    className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-950 shadow"
                    style={{
                      left: `${getAqiPosition(
                        data.aqi
                      )}%`,
                    }}
                  />
                )}
              </div>

              <div className="mt-2 flex justify-between text-[10px] font-semibold text-slate-500">
                <span>Bra</span>
                <span>Måttlig</span>
                <span>Dålig</span>
                <span>Mycket dålig</span>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
                Föroreningar
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Individuella AQI-värden från mätstationen
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <PollutantCard
                label="PM2,5"
                value={data.pollutants.pm25}
                description="Små partiklar från bland annat trafik och förbränning."
                isDominant={
                  dominantPollutant ===
                  "PM2,5"
                }
              />

              <PollutantCard
                label="PM10"
                value={data.pollutants.pm10}
                description="Större partiklar, exempelvis vägdamm och slitage."
                isDominant={
                  dominantPollutant ===
                  "PM10"
                }
              />

              <PollutantCard
                label="NO₂"
                value={data.pollutants.no2}
                description="Kvävedioxid som ofta är kopplad till vägtrafik."
                isDominant={
                  dominantPollutant ===
                  "NO₂"
                }
              />
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-start gap-3">
              <CircleHelp
                size={19}
                className="mt-0.5 shrink-0 text-blue-300"
              />

              <div>
                <p className="text-sm font-semibold text-white">
                  Så läser du värdena
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Lägre AQI är bättre. 0–50 räknas som bra,
                  51–100 som måttligt och högre värden innebär
                  successivt sämre luftkvalitet.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
            <div className="flex items-start gap-2 text-xs text-slate-500">
              <MapPin
                size={14}
                className="mt-0.5 shrink-0 text-slate-600"
              />

              <span>
                Mätstation:{" "}
                <span className="text-slate-400">
                  {data.station}
                </span>
              </span>
            </div>

            <div className="flex items-start gap-2 text-xs text-slate-500 sm:justify-end">
              <Clock3
                size={14}
                className="mt-0.5 shrink-0 text-slate-600"
              />

              <span>
                Mättid:{" "}
                <span className="text-slate-400">
                  {formatTime(
                    data.measuredAt
                  )}
                </span>
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-slate-600">
            <Sparkles
              size={13}
              className="mt-0.5 shrink-0"
            />

            <p>
              PM2,5, PM10 och NO₂ visas som individuella
              AQI-värden, inte som rå koncentration i µg/m³.
              Källa: {data.source}.
            </p>
          </div>

          {error && (
            <p className="mt-3 text-xs text-amber-300">
              Senaste uppdateringen misslyckades. Visar
              senast hämtade data.
            </p>
          )}
        </>
      ) : null}
    </Card>
  );
}
