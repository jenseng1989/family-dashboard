"use client";

import {
  AlertTriangle,
  RefreshCw,
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

  const date =
    new Date(normalized);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
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
      return "border-emerald-300/20 bg-emerald-400/[0.08] text-emerald-200";
    case "moderate":
      return "border-yellow-300/20 bg-yellow-400/[0.08] text-yellow-200";
    case "sensitive":
      return "border-orange-300/20 bg-orange-400/[0.08] text-orange-200";
    case "unhealthy":
      return "border-red-300/20 bg-red-400/[0.08] text-red-200";
    case "very-unhealthy":
      return "border-purple-300/20 bg-purple-400/[0.08] text-purple-200";
    case "hazardous":
      return "border-rose-300/20 bg-rose-950/30 text-rose-200";
    default:
      return "border-white/10 bg-white/[0.04] text-slate-200";
  }
}

function PollutantCard({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
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
    </div>
  );
}

export default function AirQualityWidget() {
  const [data, setData] =
    useState<AirQualityResponse | null>(
      null
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [error, setError] =
    useState<string | null>(
      null
    );

  const loadData =
    useCallback(
      async (
        showLoader = true,
        forceRefresh = false
      ) => {
        if (showLoader) {
          setIsLoading(true);
        }

        setError(null);

        try {
          const response =
            await fetch(
              "/api/air-quality",
              forceRefresh
                ? {
                    cache:
                      "reload",
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
        } catch (
          fetchError
        ) {
          console.error(
            "Kunde inte hämta luftkvalitet:",
            fetchError
          );

          setError(
            fetchError instanceof
              Error
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
        () =>
          void loadData(
            false
          ),
        5 * 60_000
      );

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, [loadData]);

  return (
    <Card
      title="Luften"
      icon={
        <Wind
          size={28}
        />
      }
    >
      {isLoading &&
      !data ? (
        <div className="flex min-h-52 flex-col items-center justify-center gap-3">
          <RefreshCw
            size={28}
            className="animate-spin text-emerald-300"
          />

          <p className="text-sm text-slate-400">
            Hämtar luftkvaliteten i Göteborg…
          </p>
        </div>
      ) : error &&
        !data ? (
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
                  void loadData(
                    true,
                    true
                  )
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
            className={`rounded-2xl border p-5 ${getLevelClasses(
              data.level.key
            )}`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">
                  Luftkvalitet
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {
                    data.level
                      .label
                  }
                </p>
              </div>

              <div className="sm:text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-70">
                  AQI
                </p>

                <p className="text-3xl font-black">
                  {data.aqi ??
                    "–"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <PollutantCard
              label="PM2,5"
              value={
                data
                  .pollutants
                  .pm25
              }
            />

            <PollutantCard
              label="PM10"
              value={
                data
                  .pollutants
                  .pm10
              }
            />

            <PollutantCard
              label="NO₂"
              value={
                data
                  .pollutants
                  .no2
              }
            />
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.05] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
              Sammanfattning
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              {
                data.level
                  .summary
              }
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Mätstation:{" "}
              {
                data.station
              }
            </span>

            <span>
              Mättid:{" "}
              {formatTime(
                data.measuredAt
              )}
            </span>
          </div>

          <p className="mt-2 text-[11px] leading-5 text-slate-600">
            PM2,5, PM10 och
            NO₂ visas som
            individuella
            AQI-värden. Källa:{" "}
            {data.source}.
          </p>

          {error && (
            <p className="mt-3 text-xs text-amber-300">
              Senaste uppdateringen
              misslyckades. Visar
              senast hämtade data.
            </p>
          )}
        </>
      ) : null}
    </Card>
  );
}
