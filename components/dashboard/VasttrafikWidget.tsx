"use client";

import {
  AlertTriangle,
  BusFront,
  Clock3,
  RefreshCw,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import Card from "@/components/ui/Card";

type Departure = {
  id: string;
  line: string;
  direction: string;
  departureTime: string | null;
  plannedTime: string | null;
  minutes: number | null;
  delayMinutes: number | null;
  cancelled: boolean;
  backgroundColor: string | null;
  foregroundColor: string | null;
};

type VasttrafikResponse = {
  stop: {
    name: string;
    gid: string;
  };
  departures: Departure[];
  updatedAt: string;
  source: string;
};

function formatDepartureTime(
  value: string | null
): string {
  if (!value) {
    return "–";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "–";
  }

  return date.toLocaleTimeString(
    "sv-SE",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function formatUpdatedTime(
  value: string
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "–";
  }

  return date.toLocaleTimeString(
    "sv-SE",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function getMinutesText(
  minutes: number | null
): string {
  if (minutes === null) {
    return "–";
  }

  if (minutes <= 0) {
    return "Nu";
  }

  if (minutes === 1) {
    return "1 min";
  }

  return `${minutes} min`;
}

export default function VasttrafikWidget() {
  const [
    data,
    setData,
  ] =
    useState<VasttrafikResponse | null>(
      null
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const loadData =
    useCallback(
      async (
        showLoader = true
      ) => {
        if (showLoader) {
          setIsLoading(true);
        }

        setError(null);

        try {
          const response =
            await fetch(
              "/api/vasttrafik",
              {
                cache: "no-store",
              }
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
            result as VasttrafikResponse
          );
        } catch (
          fetchError
        ) {
          console.error(
            "Kunde inte hämta Västtrafik:",
            fetchError
          );

          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Västtrafik kunde inte hämtas."
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
        () => {
          void loadData(false);
        },
        60_000
      );

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, [loadData]);

  return (
    <Card
      title="Västtrafik"
      icon={
        <BusFront
          size={28}
        />
      }
    >
      {isLoading &&
      !data ? (
        <div className="flex min-h-52 flex-col items-center justify-center gap-3">
          <RefreshCw
            size={28}
            className="animate-spin text-blue-300"
          />

          <p className="text-sm text-slate-400">
            Hämtar avgångar från
            Vågmästareplatsen…
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
                Västtrafik kunde inte hämtas
              </p>

              <p className="mt-1 text-sm text-slate-300">
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  void loadData()
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
          <div className="mb-4 rounded-2xl border border-blue-300/15 bg-blue-500/[0.07] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
              Hållplats
            </p>

            <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <p className="text-xl font-bold text-white">
                {data.stop.name}
              </p>

              <button
                type="button"
                onClick={() =>
                  void loadData()
                }
                className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <RefreshCw
                  size={14}
                />
                Uppdatera
              </button>
            </div>
          </div>

          {data.departures.length >
          0 ? (
            <div className="grid gap-2">
              {data.departures.map(
                (
                  departure
                ) => (
                  <article
                    key={
                      departure.id
                    }
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                  >
                    <div
                      className="flex h-10 min-w-10 items-center justify-center rounded-xl px-2 text-sm font-black"
                      style={{
                        backgroundColor:
                          departure.backgroundColor ??
                          "#3b82f6",
                        color:
                          departure.foregroundColor ??
                          "#ffffff",
                      }}
                    >
                      {departure.line}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">
                        {
                          departure.direction
                        }
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        <span>
                          {formatDepartureTime(
                            departure.departureTime
                          )}
                        </span>

                        {departure.delayMinutes !==
                          null &&
                          departure.delayMinutes >
                            0 && (
                            <span className="font-semibold text-amber-300">
                              +
                              {
                                departure.delayMinutes
                              }{" "}
                              min
                            </span>
                          )}

                        {departure.cancelled && (
                          <span className="font-semibold text-red-300">
                            Inställd
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-200">
                        {getMinutesText(
                          departure.minutes
                        )}
                      </p>
                    </div>
                  </article>
                )
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
              <Clock3
                size={28}
                className="mx-auto text-blue-300"
              />

              <p className="mt-3 font-semibold text-white">
                Inga avgångar hittades
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4 text-xs text-slate-500">
            <span>
              Källa: {data.source}
            </span>

            <span>
              Uppdaterad{" "}
              {formatUpdatedTime(
                data.updatedAt
              )}
            </span>
          </div>

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