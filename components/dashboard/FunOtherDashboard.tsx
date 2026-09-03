"use client";

import {
  AlertTriangle,
  Clock3,
  Globe2,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import dynamic from "next/dynamic";
import LazyViewport from "@/components/dashboard/LazyViewport";
import OrderedWidgetGroup from "@/components/dashboard/OrderedWidgetGroup";
import WidgetGate from "@/components/dashboard/WidgetGate";
import type {
  EarthData,
  VolcanoData,
} from "@/lib/earth-dashboard-types";

function formatMagnitude(
  value: number
): string {
  return value.toFixed(1);
}

function getTimeAgo(
  value: string
): string {
  const timestamp =
    new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return "Okänd tid";
  }

  const minutes = Math.floor(
    Math.max(
      0,
      Date.now() - timestamp
    ) / 60000
  );

  if (minutes < 1) {
    return "Nyss";
  }

  if (minutes < 60) {
    return `${minutes} min sedan`;
  }

  const hours =
    Math.floor(minutes / 60);

  return `${hours} ${
    hours === 1
      ? "timme"
      : "timmar"
  } sedan`;
}

function getActivityClasses(
  level: EarthData["summary"]["activityLevel"]
): string {
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

      <p className="mt-2 text-2xl font-bold text-white">
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}


function EarthWidgetLoading({
  label,
}: {
  label: string;
}) {
  return (
    <div className="flex min-h-52 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center gap-3 text-slate-400">
        <LoaderCircle
          size={20}
          className="animate-spin text-emerald-300"
        />
        <span className="text-sm font-semibold">
          Laddar {label}…
        </span>
      </div>
    </div>
  );
}

const EarthVolcanoesWidget = dynamic(
  () =>
    import(
      "@/components/dashboard/EarthVolcanoesWidget"
    ),
  {
    ssr: false,
    loading: () => (
      <EarthWidgetLoading label="vulkaner" />
    ),
  }
);

const EarthEarthquakesWidget = dynamic(
  () =>
    import(
      "@/components/dashboard/EarthEarthquakesWidget"
    ),
  {
    ssr: false,
    loading: () => (
      <EarthWidgetLoading label="jordbävningar" />
    ),
  }
);

export default function FunOtherDashboard() {
  const [data, setData] =
    useState<EarthData | null>(
      null
    );

  const [
    volcanoData,
    setVolcanoData,
  ] = useState<VolcanoData | null>(
    null
  );

  const [
    volcanoError,
    setVolcanoError,
  ] = useState<string | null>(
    null
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null
  );

  const [clock, setClock] =
    useState(0);

  const loadData =
    useCallback(
      async (
        showLoader = true,
        forceRefresh = false
      ) => {
        if (showLoader) {
          setIsLoading(true);
        }

        setErrorMessage(null);
        setVolcanoError(null);

        try {
          const [
            earthResponse,
            volcanoResponse,
          ] = await Promise.all([
            fetch(
              "/api/earth",
              forceRefresh
                ? {
                    cache:
                      "reload",
                  }
                : undefined
            ),
            fetch(
              "/api/volcanoes",
              forceRefresh
                ? {
                    cache:
                      "reload",
                  }
                : undefined
            ),
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
      },
      []
    );

  useEffect(() => {
    void loadData();

    const intervalId =
      window.setInterval(() => {
        void loadData(false);
      }, 5 * 60 * 1000);

    return () =>
      window.clearInterval(
        intervalId
      );
  }, [loadData]);

  useEffect(() => {
    const intervalId =
      window.setInterval(() => {
        setClock(
          (value) => value + 1
        );
      }, 60 * 1000);

    return () =>
      window.clearInterval(
        intervalId
      );
  }, []);

  const earthquakes =
    useMemo(
      () =>
        data?.earthquakes ?? [],
      [data, clock]
    );

  if (isLoading && !data) {
    return (
      <section className="relative overflow-hidden rounded-[2rem] border border-emerald-300/10 bg-gradient-to-br from-slate-950 via-emerald-950/45 to-slate-950 p-6 shadow-2xl shadow-emerald-950/20">
        <div className="flex min-h-[28rem] flex-col items-center justify-center gap-4">
          <LoaderCircle
            size={38}
            className="animate-spin text-emerald-300"
          />

          <p className="text-slate-300">
            Lyssnar på jordskorpan…
          </p>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="rounded-[2rem] border border-red-300/15 bg-slate-950/70 p-6">
        <div className="flex min-h-72 flex-col items-center justify-center text-center">
          <AlertTriangle
            size={38}
            className="text-red-300"
          />

          <p className="mt-4 font-semibold text-white">
            Jorden kunde inte laddas
          </p>

          <p className="mt-2 text-sm text-slate-400">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadData(
                true,
                true
              )
            }
            className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-500"
          >
            <RefreshCw size={17} />
            Försök igen
          </button>
        </div>
      </section>
    );
  }

  const earthWidgets = [
    {
      id: "earth-volcanoes",
      className:
        "col-span-12 min-w-0",
      content: (
        <LazyViewport
          fallback={
            <EarthWidgetLoading label="vulkaner" />
          }
        >
          <EarthVolcanoesWidget
            data={volcanoData}
            error={volcanoError}
          />
        </LazyViewport>
      ),
    },
    {
      id: "earth-earthquakes",
      className:
        "col-span-12 min-w-0",
      content: (
        <LazyViewport
          fallback={
            <EarthWidgetLoading label="jordbävningar" />
          }
        >
          <EarthEarthquakesWidget
            data={data}
            earthquakes={earthquakes}
          />
        </LazyViewport>
      ),
    },
  ];

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

              <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
                Jorden just nu
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Jordbävningar i
                realtid och pågående
                vulkanutbrott. Blixtar
                och oväder bygger vi in
                i nästa steg.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadData(
                  false,
                  true
                )
              }
              className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20"
            >
              <RefreshCw size={17} />
              Uppdatera
            </button>
          </div>
        </header>

        {/* Fast informationsdel – administreras inte som widget */}
        <div className="mb-5 rounded-3xl border border-emerald-300/10 bg-gradient-to-br from-emerald-400/[0.08] via-slate-950/30 to-amber-400/[0.05] p-5">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  Global seismisk
                  aktivitet · senaste
                  24 timmarna
                </p>

                <h3 className="mt-2 text-2xl font-bold text-white">
                  {data.summary.largest
                    ? `Starkast: M ${formatMagnitude(
                        data.summary
                          .largest
                          .magnitude
                      )}`
                    : "Inga skalv tillgängliga"}
                </h3>

                {data.summary
                  .largest && (
                  <p className="mt-2 max-w-2xl text-sm text-slate-400">
                    {
                      data.summary
                        .largest.place
                    }
                  </p>
                )}
              </div>

              <span
                className={[
                  "rounded-full border px-3 py-1.5 text-sm font-semibold",
                  getActivityClasses(
                    data.summary
                      .activityLevel
                  ),
                ].join(" ")}
              >
                {
                  data.summary
                    .activityLevel
                }{" "}
                aktivitet
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryStat
                label="M4+"
                value={String(
                  data.summary
                    .magnitude4
                )}
                description="Skalv med magnitud 4,0 eller högre."
              />

              <SummaryStat
                label="M5+"
                value={String(
                  data.summary
                    .magnitude5
                )}
                description="Skalv med magnitud 5,0 eller högre."
              />

              <SummaryStat
                label="M6+"
                value={String(
                  data.summary
                    .magnitude6
                )}
                description="Kraftiga skalv senaste dygnet."
              />

              <SummaryStat
                label="Alla registrerade"
                value={String(
                  data.summary
                    .totalEarthquakes
                )}
                description="Händelser i USGS globala dygnsflöde."
              />
            </div>

            {data.summary.latestM4 && (
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                <Clock3
                  size={19}
                  className="mt-0.5 shrink-0 text-emerald-300"
                />

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                    Senaste M4+
                  </p>

                  <p className="mt-1 font-semibold text-white">
                    M{" "}
                    {formatMagnitude(
                      data.summary
                        .latestM4
                        .magnitude
                    )}{" "}
                    ·{" "}
                    {
                      data.summary
                        .latestM4
                        .place
                    }
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {getTimeAgo(
                      data.summary
                        .latestM4
                        .time
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4">
            <AlertTriangle
              size={18}
              className="mt-0.5 shrink-0 text-amber-300"
            />

            <p className="text-sm text-amber-100/80">
              Senaste uppdateringen av jordbävningsdata misslyckades. Visar senast hämtade data.
            </p>
          </div>
        )}

        <OrderedWidgetGroup
          wrapperClassName="grid w-full min-w-0 grid-cols-12 gap-5"
          itemComponent={WidgetGate}
          widgets={earthWidgets}
        />

        <p className="mt-5 text-center text-xs text-slate-500">
          USGS-data senast genererad{" "}
          {new Date(
            data.generatedAt
          ).toLocaleTimeString(
            "sv-SE",
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          )}
        </p>
      </div>
    </section>
  );
}