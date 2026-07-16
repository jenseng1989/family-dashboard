"use client";

import {
  AlertTriangle,
  ExternalLink,
  Globe2,
  LoaderCircle,
  Orbit,
  PawPrint,
  RefreshCw,
  Rocket,
  Sparkles,
  Telescope,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import Card from "@/components/ui/Card";

type FunData = {
  generatedAt: string;
  iss: {
    latitude: number;
    longitude: number;
    altitudeKm: number;
    velocityKmh: number;
    visibility: string;
    timestamp: string;
    mapsUrl: string;
  } | null;
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
  animal: {
    name: string;
    emoji: string;
    habitat: string;
    fact: string;
  };
  errors: {
    iss: string | null;
    asteroid: string | null;
  };
};

function formatSwedishDate(
  dateString: string | null
): string {
  if (!dateString) {
    return "Okänt";
  }

  return new Date(dateString).toLocaleDateString(
    "sv-SE",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("sv-SE").format(value);
}

function StatBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-violet-300/10 bg-slate-950/35 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300/80">
        {label}
      </p>

      <p className="mt-2 text-lg font-bold text-white">
        {value}
      </p>
    </div>
  );
}

function SpaceError({
  message,
}: {
  message: string;
}) {
  return (
    <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4">
      <p className="flex items-center gap-2 text-sm text-amber-200">
        <AlertTriangle size={17} />
        {message}
      </p>
    </div>
  );
}

export default function FunDashboard() {
  const [data, setData] = useState<FunData | null>(
    null
  );
  const [isLoading, setIsLoading] =
    useState(true);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/fun", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          `API-fel ${response.status}`
        );
      }

      const result =
        (await response.json()) as FunData;

      setData(result);
    } catch (error) {
      console.error(
        "Kunde inte hämta roliga fakta:",
        error
      );

      setErrorMessage(
        "Kunde inte hämta innehållet just nu."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <section className="relative overflow-hidden rounded-[2rem] border border-violet-300/10 bg-slate-950/70 p-6 shadow-2xl shadow-violet-950/30">
        <div className="flex min-h-[28rem] flex-col items-center justify-center gap-4">
          <LoaderCircle
            size={38}
            className="animate-spin text-violet-300"
          />

          <p className="text-slate-300">
            Hämtar rymden och dagens djur…
          </p>
        </div>
      </section>
    );
  }

  if (!data || errorMessage) {
    return (
      <section className="rounded-[2rem] border border-red-300/15 bg-slate-950/70 p-6">
        <div className="flex min-h-72 flex-col items-center justify-center text-center">
          <AlertTriangle
            size={38}
            className="text-red-300"
          />

          <p className="mt-4 font-semibold text-white">
            Något gick fel
          </p>

          <p className="mt-2 text-sm text-slate-400">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() => void loadData()}
            className="mt-5 flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 font-semibold text-white transition hover:bg-violet-400"
          >
            <RefreshCw size={17} />
            Försök igen
          </button>
        </div>
      </section>
    );
  }

  const visiblePlanets = data.planets.filter(
    (planet) => planet.visible
  );

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-violet-300/10 bg-gradient-to-br from-slate-950 via-indigo-950/80 to-slate-950 p-4 shadow-2xl shadow-violet-950/30 sm:p-6">
      <div className="pointer-events-none absolute inset-0">
        <span className="absolute left-[8%] top-[8%] h-1 w-1 rounded-full bg-white/70 shadow-[0_0_8px_white]" />
        <span className="absolute left-[27%] top-[18%] h-1.5 w-1.5 rounded-full bg-violet-200/70 shadow-[0_0_10px_#c4b5fd]" />
        <span className="absolute right-[16%] top-[12%] h-1 w-1 rounded-full bg-white/70 shadow-[0_0_8px_white]" />
        <span className="absolute right-[35%] top-[38%] h-1 w-1 rounded-full bg-blue-200/70 shadow-[0_0_8px_#bfdbfe]" />
        <span className="absolute bottom-[16%] left-[14%] h-1 w-1 rounded-full bg-white/60 shadow-[0_0_8px_white]" />
        <span className="absolute bottom-[9%] right-[12%] h-1.5 w-1.5 rounded-full bg-fuchsia-200/60 shadow-[0_0_10px_#f5d0fe]" />
        <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-28 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative z-10">
        <header className="mb-6 rounded-3xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
                <Sparkles size={17} />
                Roligt
              </p>

              <h2 className="mt-2 text-3xl font-bold text-white">
                Utforska världen och rymden
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Live-position för ISS, asteroider från NASA,
                månfaser, planetpositioner över Göteborg och
                ett nytt djur varje dag.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadData()}
              className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-300/20 bg-violet-400/10 px-4 py-3 text-sm font-semibold text-violet-100 transition hover:bg-violet-400/20"
            >
              <RefreshCw size={17} />
              Uppdatera
            </button>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card
            title="Var är ISS?"
            icon={<Rocket size={28} />}
            className="border-violet-300/15 bg-slate-950/55 hover:bg-slate-950/70"
          >
            {data.iss ? (
              <div>
                <div className="relative mb-5 aspect-[2/1] overflow-hidden rounded-2xl border border-violet-300/10 bg-[radial-gradient(circle_at_30%_35%,rgba(59,130,246,0.32),transparent_18%),radial-gradient(circle_at_65%_60%,rgba(16,185,129,0.20),transparent_16%),linear-gradient(145deg,#071126,#111b3d)]">
                  <div
                    className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                    style={{
                      left: `${((data.iss.longitude + 180) / 360) * 100}%`,
                      top: `${((90 - data.iss.latitude) / 180) * 100}%`,
                    }}
                  >
                    <div className="absolute h-12 w-12 animate-ping rounded-full bg-violet-400/20" />
                    <div className="relative rounded-full border border-violet-200/30 bg-violet-500 p-2 text-white shadow-[0_0_24px_rgba(139,92,246,0.8)]">
                      <Rocket size={20} />
                    </div>
                  </div>

                  <div className="absolute bottom-3 left-3 rounded-lg bg-slate-950/70 px-3 py-1.5 text-xs text-slate-300 backdrop-blur">
                    Schematisk världskarta
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <StatBox
                    label="Position"
                    value={`${data.iss.latitude}°, ${data.iss.longitude}°`}
                  />
                  <StatBox
                    label="Höjd"
                    value={`${formatNumber(data.iss.altitudeKm)} km`}
                  />
                  <StatBox
                    label="Hastighet"
                    value={`${formatNumber(data.iss.velocityKmh)} km/h`}
                  />
                  <StatBox
                    label="Ljusförhållande"
                    value={
                      data.iss.visibility === "daylight"
                        ? "Dagsljus"
                        : "Mörker"
                    }
                  />
                </div>

                <a
                  href={data.iss.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-violet-300/15 bg-violet-400/10 px-4 py-2.5 text-sm font-semibold text-violet-200 transition hover:bg-violet-400/20"
                >
                  <Globe2 size={17} />
                  Öppna positionen
                  <ExternalLink size={15} />
                </a>
              </div>
            ) : (
              <SpaceError
                message={
                  data.errors.iss ||
                  "ISS-data saknas."
                }
              />
            )}
          </Card>

          <Card
            title="Asteroidvarning"
            icon={<Orbit size={28} />}
            className="border-violet-300/15 bg-slate-950/55 hover:bg-slate-950/70"
          >
            {data.asteroid?.nearest ? (
              <div>
                <div
                  className={[
                    "rounded-2xl border p-5",
                    data.asteroid.nearest.hazardous
                      ? "border-amber-300/25 bg-amber-400/10"
                      : "border-emerald-300/20 bg-emerald-400/10",
                  ].join(" ")}
                >
                  <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
                    Närmaste passage kommande sju dagar
                  </p>

                  <h3 className="mt-2 break-words text-2xl font-bold text-white">
                    {data.asteroid.nearest.name}
                  </h3>

                  <p
                    className={[
                      "mt-3 text-sm font-semibold",
                      data.asteroid.nearest.hazardous
                        ? "text-amber-200"
                        : "text-emerald-200",
                    ].join(" ")}
                  >
                    {data.asteroid.nearest.hazardous
                      ? "NASA klassar objektet som potentiellt riskfyllt"
                      : "Ingen klassning som potentiellt riskfyllt objekt"}
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <StatBox
                    label="Uppskattad diameter"
                    value={`${formatNumber(
                      data.asteroid.nearest
                        .diameterMeters
                    )} m`}
                  />
                  <StatBox
                    label="Avstånd"
                    value={`${data.asteroid.nearest.lunarDistances} månavstånd`}
                  />
                  <StatBox
                    label="Hastighet"
                    value={`${formatNumber(
                      data.asteroid.nearest.velocityKmh
                    )} km/h`}
                  />
                  <StatBox
                    label="Passage"
                    value={
                      data.asteroid.nearest
                        .approachDate
                    }
                  />
                </div>

                <p className="mt-4 text-xs text-slate-500">
                  NASA listar totalt{" "}
                  {data.asteroid.totalThisWeek} objekt
                  under perioden.
                </p>
              </div>
            ) : (
              <SpaceError
                message={
                  data.errors.asteroid ||
                  "Asteroiddata saknas."
                }
              />
            )}
          </Card>

          <Card
            title="Månfaser"
            icon={
              <span className="text-2xl">
                {data.moon.emoji}
              </span>
            }
            className="border-violet-300/15 bg-slate-950/55 hover:bg-slate-950/70"
          >
            <div className="flex flex-col items-center rounded-2xl border border-violet-300/10 bg-gradient-to-b from-violet-400/10 to-transparent p-6 text-center">
              <div className="text-7xl drop-shadow-[0_0_24px_rgba(196,181,253,0.35)]">
                {data.moon.emoji}
              </div>

              <h3 className="mt-4 text-2xl font-bold text-white">
                {data.moon.phaseName}
              </h3>

              <p className="mt-2 text-violet-200">
                {data.moon.illuminatedPercent}% belyst
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <StatBox
                label="Nästa fullmåne"
                value={formatSwedishDate(
                  data.moon.nextFullMoon
                )}
              />
              <StatBox
                label="Nästa nymåne"
                value={formatSwedishDate(
                  data.moon.nextNewMoon
                )}
              />
            </div>
          </Card>

          <Card
            title="Planetguide"
            icon={<Telescope size={28} />}
            className="border-violet-300/15 bg-slate-950/55 hover:bg-slate-950/70"
          >
            <p className="mb-4 text-sm text-slate-400">
              Planeternas läge just nu sett från Göteborg.
              Positiv höjd betyder att planeten är ovanför
              horisonten.
            </p>

            <div className="grid gap-3">
              {data.planets.map((planet) => (
                <div
                  key={planet.name}
                  className={[
                    "flex items-center gap-4 rounded-2xl border p-4",
                    planet.visible
                      ? "border-violet-300/15 bg-violet-400/10"
                      : "border-white/5 bg-white/[0.03] opacity-65",
                  ].join(" ")}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950/50 text-2xl text-violet-200">
                    {planet.emoji}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-white">
                        {planet.name}
                      </p>

                      <span
                        className={[
                          "rounded-full px-2.5 py-1 text-xs font-semibold",
                          planet.visible
                            ? "bg-emerald-400/15 text-emerald-200"
                            : "bg-slate-500/15 text-slate-400",
                        ].join(" ")}
                      >
                        {planet.visible
                          ? "Ovanför horisonten"
                          : "Under horisonten"}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-400">
                      {planet.altitude}° höjd ·{" "}
                      {planet.direction} · magnitud{" "}
                      {planet.magnitude}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-slate-500">
              {visiblePlanets.length} av{" "}
              {data.planets.length} planeter är
              ovanför horisonten just nu. Moln och
              dagsljus kan ändå göra dem osynliga.
            </p>
          </Card>

          <Card
            title="Dagens djur"
            icon={<PawPrint size={28} />}
            className="xl:col-span-2 border-violet-300/15 bg-slate-950/55 hover:bg-slate-950/70"
          >
            <div className="grid gap-5 md:grid-cols-[180px_1fr] md:items-center">
              <div className="flex aspect-square items-center justify-center rounded-3xl border border-fuchsia-300/15 bg-gradient-to-br from-fuchsia-400/15 via-violet-400/10 to-blue-400/10 text-8xl shadow-inner shadow-black/20">
                {data.animal.emoji}
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-fuchsia-300">
                  Dagens utvalda djur
                </p>

                <h3 className="mt-2 text-3xl font-bold text-white">
                  {data.animal.name}
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  Lever i: {data.animal.habitat}
                </p>

                <blockquote className="mt-5 rounded-2xl border border-fuchsia-300/10 bg-fuchsia-400/10 p-5 text-lg leading-8 text-slate-100">
                  “{data.animal.fact}”
                </blockquote>

                <p className="mt-3 text-xs text-slate-500">
                  Ett nytt djur väljs automatiskt varje dag.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <p className="mt-5 text-center text-xs text-slate-500">
          Senast uppdaterad{" "}
          {new Date(data.generatedAt).toLocaleTimeString(
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
