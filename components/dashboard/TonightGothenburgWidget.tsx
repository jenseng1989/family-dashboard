"use client";

import {
  AlertTriangle,
  LoaderCircle,
  Moon,
  Orbit,
  RefreshCw,
  Satellite,
  Sparkles,
  Star,
  Telescope,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Card from "@/components/ui/Card";

type FunData = {
  asteroid: {
    totalThisWeek: number;
    nearest: {
      id: string;
      name: string;
      hazardous: boolean;
      diameterMeters: number;
      missDistanceKm: number;
      lunarDistances: number;
      velocityKmh: number;
      approachDate: string;
    } | null;
  } | null;

  moon: {
    phaseName: string;
    emoji: string;
    illuminatedPercent: number;
    phaseAngle: number;
    nextFullMoon: string | null;
    nextNewMoon: string | null;
  };

  planets: Array<{
    name: string;
    emoji: string;
    altitude: number;
    azimuth: number;
    direction: string;
    magnitude: number;
    visible: boolean;
  }>;
};

type SpaceWeatherData = {
  kpIndex: number;
  auroraChance: string;
  auroraStars: number;
  level: string;
};

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
  emoji: string;
  description: string;
  nextPass: SatellitePass | null;
};

type SatellitesData = {
  location: string;
  generatedAt: string;
  satellites: SatelliteItem[];
};

type TonightData = {
  fun: FunData;
  spaceWeather: SpaceWeatherData | null;
  satellites: SatellitesData | null;
};

function renderStars(
  stars: number
): string {
  const safeStars = Math.min(
    5,
    Math.max(0, stars)
  );

  return `${"★".repeat(
    safeStars
  )}${"☆".repeat(
    5 - safeStars
  )}`;
}

function formatSatelliteTime(
  timestamp: number
): string {
  return new Date(
    timestamp * 1000
  ).toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSatelliteDate(
  timestamp: number
): string {
  const date = new Date(
    timestamp * 1000
  );

  const today = new Date();

  const tomorrow = new Date();
  tomorrow.setDate(
    tomorrow.getDate() + 1
  );

  const dateString =
    date.toLocaleDateString(
      "sv-SE"
    );

  if (
    dateString ===
    today.toLocaleDateString(
      "sv-SE"
    )
  ) {
    return "idag";
  }

  if (
    dateString ===
    tomorrow.toLocaleDateString(
      "sv-SE"
    )
  ) {
    return "imorgon";
  }

  return date.toLocaleDateString(
    "sv-SE",
    {
      weekday: "short",
      day: "numeric",
      month: "short",
    }
  );
}

function formatAsteroidDate(
  dateString: string
): string {
  const [year, month, day] =
    dateString
      .split("-")
      .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return dateString;
  }

  const target =
    new Date(
      year,
      month - 1,
      day
    );

  const today =
    new Date();

  const todayStart =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

  const targetStart =
    new Date(
      target.getFullYear(),
      target.getMonth(),
      target.getDate()
    );

  const days =
    Math.round(
      (
        targetStart.getTime() -
        todayStart.getTime()
      ) /
        86400000
    );

  if (days === 0) {
    return "idag";
  }

  if (days === 1) {
    return "imorgon";
  }

  return target.toLocaleDateString(
    "sv-SE",
    {
      day: "numeric",
      month: "short",
    }
  );
}

function TonightRow({
  icon,
  label,
  title,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
          {label}
        </p>

        <p className="mt-1 font-semibold text-white">
          {title}
        </p>

        {description && (
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export default function TonightGothenburgWidget() {
  const [data, setData] =
    useState<TonightData | null>(
      null
    );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<
    string | null
  >(null);

  const loadData =
    useCallback(async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [
          funResponse,
          spaceResponse,
          satelliteResponse,
        ] = await Promise.all([
          fetch("/api/fun", {
            cache: "no-store",
          }),

          fetch(
            "/api/space-weather",
            {
              cache: "no-store",
            }
          ),

          fetch(
            "/api/satellites",
            {
              cache: "no-store",
            }
          ),
        ]);

        if (
          !funResponse.ok
        ) {
          throw new Error(
            "Grundläggande rymddata kunde inte hämtas."
          );
        }

        const fun =
          (await funResponse.json()) as FunData;

        let spaceWeather:
          SpaceWeatherData | null =
          null;

        let satellites:
          SatellitesData | null =
          null;

        if (
          spaceResponse.ok
        ) {
          spaceWeather =
            (await spaceResponse.json()) as SpaceWeatherData;
        }

        if (
          satelliteResponse.ok
        ) {
          satellites =
            (await satelliteResponse.json()) as SatellitesData;
        }

        setData({
          fun,
          spaceWeather,
          satellites,
        });
      } catch (error) {
        console.error(
          "Kunde inte skapa kvällsöversikten:",
          error
        );

        setErrorMessage(
          "Kvällens rymdöversikt kunde inte hämtas."
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadData();

    const intervalId =
      window.setInterval(
        () => {
          void loadData();
        },
        30 * 60 * 1000
      );

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, [loadData]);

  const visiblePlanets =
    useMemo(() => {
      if (!data) {
        return [];
      }

      return data.fun.planets
        .filter(
          (planet) =>
            planet.visible
        )
        .sort(
          (
            first,
            second
          ) =>
            second.altitude -
            first.altitude
        );
    }, [data]);

  const nextSatellite =
    useMemo(() => {
      if (
        !data?.satellites
      ) {
        return null;
      }

      return data.satellites.satellites
        .filter(
          (
            satellite
          ): satellite is SatelliteItem & {
            nextPass: SatellitePass;
          } =>
            satellite.nextPass !==
            null
        )
        .sort(
          (
            first,
            second
          ) =>
            first.nextPass
              .startUTC -
            second.nextPass
              .startUTC
        )[0] ?? null;
    }, [data]);

  return (
    <Card
      title="Ikväll över Göteborg"
      icon={
        <Sparkles
          size={28}
        />
      }
      className="border-indigo-300/15 bg-gradient-to-br from-slate-950/80 via-indigo-950/55 to-slate-950/80 hover:bg-slate-950/80"
      storageKey="space-tonight-gothenburg"
    >
      {isLoading ? (
        <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03]">
          <LoaderCircle
            size={30}
            className="animate-spin text-violet-300"
          />

          <p className="text-sm text-slate-400">
            Tittar upp mot himlen…
          </p>
        </div>
      ) : errorMessage ||
        !data ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={22}
              className="mt-0.5 shrink-0 text-red-300"
            />

            <div>
              <p className="font-semibold text-red-200">
                {errorMessage}
              </p>

              <button
                type="button"
                onClick={() =>
                  void loadData()
                }
                className="mt-4 flex items-center gap-2 rounded-xl border border-red-300/20 bg-red-300/10 px-3 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-300/20"
              >
                <RefreshCw
                  size={16}
                />
                Försök igen
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-5 rounded-2xl border border-violet-300/10 bg-gradient-to-r from-violet-400/[0.08] via-indigo-400/[0.06] to-blue-400/[0.06] p-5">
            <div className="flex items-start gap-4">
              <div className="text-5xl">
                🌌
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
                  Kvällens himmel
                </p>

                <h3 className="mt-1 text-2xl font-bold text-white">
                  Vad händer ovanför
                  Göteborg?
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  En snabb sammanfattning
                  av månen, planeter,
                  satelliter,
                  solaktivitet och
                  asteroidpassager.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <TonightRow
              icon={
                <Moon
                  size={21}
                />
              }
              label="Månen"
              title={
                data.fun.moon
                  .phaseName
              }
              description={`${data.fun.moon.illuminatedPercent}% belyst ${data.fun.moon.emoji}`}
            />

            <TonightRow
              icon={
                <Telescope
                  size={21}
                />
              }
              label="Planeter"
              title={
                visiblePlanets
                  .length > 0
                  ? visiblePlanets
                      .map(
                        (
                          planet
                        ) =>
                          `${planet.emoji} ${planet.name}`
                      )
                      .join(", ")
                  : "Inga över horisonten"
              }
              description={
                visiblePlanets
                  .length > 0
                  ? `${visiblePlanets.length} planet${
                      visiblePlanets.length ===
                      1
                        ? ""
                        : "er"
                    } över horisonten just nu.`
                  : "Ingen av de följda planeterna är ovanför horisonten."
              }
            />

            <TonightRow
              icon={
                <Satellite
                  size={21}
                />
              }
              label="Nästa satellit"
              title={
                nextSatellite
                  ? `${
                      nextSatellite
                        .emoji
                    } ${
                      nextSatellite
                        .name
                    }`
                  : "Ingen passage hittad"
              }
              description={
                nextSatellite
                  ? `${formatSatelliteDate(
                      nextSatellite
                        .nextPass
                        .startUTC
                    )} kl. ${formatSatelliteTime(
                      nextSatellite
                        .nextPass
                        .startUTC
                    )} · max ${
                      Math.round(
                        nextSatellite
                          .nextPass
                          .maxElevation
                      )
                    }°`
                  : "Ingen optiskt synlig passage i den aktuella prognosen."
              }
            />

            <TonightRow
              icon={
                <Star
                  size={21}
                />
              }
              label="Norrsken"
              title={
                data.spaceWeather
                  ? data
                      .spaceWeather
                      .auroraChance
                  : "Ingen data"
              }
              description={
                data.spaceWeather
                  ? `${renderStars(
                      data
                        .spaceWeather
                        .auroraStars
                    )} · Kp ${data.spaceWeather.kpIndex}`
                  : "Rymdväderdata kunde inte hämtas."
              }
            />

            <TonightRow
              icon={
                <Orbit
                  size={21}
                />
              }
              label="Asteroid"
              title={
                data.fun
                  .asteroid
                  ?.nearest
                  ?.name ??
                "Ingen data"
              }
              description={
                data.fun
                  .asteroid
                  ?.nearest
                  ? `Passerar ${formatAsteroidDate(
                      data.fun
                        .asteroid
                        .nearest
                        .approachDate
                    )} · ${
                      data.fun
                        .asteroid
                        .nearest
                        .lunarDistances
                    } månavstånd`
                  : "Ingen asteroidpassage tillgänglig."
              }
            />
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
            <Sparkles
              size={18}
              className="mt-0.5 shrink-0 text-violet-300"
            />

            <p className="text-xs leading-5 text-slate-400">
              Planetstatusen visar
              objekt som är ovanför
              horisonten just nu.
              Faktisk synlighet
              påverkas även av
              dagsljus, moln,
              ljusföroreningar och
              objektets ljusstyrka.
            </p>
          </div>
        </>
      )}
    </Card>
  );
}