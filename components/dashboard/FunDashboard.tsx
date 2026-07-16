"use client";

import {
  AlertTriangle,
  ExternalLink,
  Globe2,
  LoaderCircle,
  Orbit,
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
    source?: string;
    isEstimated?: boolean;
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

function IssWorldMap({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const markerLeft =
    ((longitude + 180) / 360) * 100;
  const markerTop =
    ((90 - latitude) / 180) * 100;

  return (
    <div className="relative mb-5 aspect-[2/1] overflow-hidden rounded-2xl border border-violet-300/15 bg-[#071426] shadow-inner shadow-black/30">
      <svg
        viewBox="0 0 1000 500"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="Tydlig schematisk världskarta med ISS-position"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient
            id="oceanGradient"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#0b1f3a"
            />
            <stop
              offset="100%"
              stopColor="#102a4a"
            />
          </linearGradient>

          <linearGradient
            id="landGradient"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#34d399"
            />
            <stop
              offset="100%"
              stopColor="#15803d"
            />
          </linearGradient>

          <filter
            id="landShadow"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="2"
              floodColor="#000000"
              floodOpacity="0.35"
            />
          </filter>
        </defs>

        <rect
          width="1000"
          height="500"
          fill="url(#oceanGradient)"
        />

        {/* Longitudlinjer */}
        {Array.from({ length: 11 }).map(
          (_, index) => (
            <line
              key={`lon-${index}`}
              x1={index * 100}
              y1="0"
              x2={index * 100}
              y2="500"
              stroke="#93c5fd"
              strokeOpacity="0.12"
              strokeWidth="1"
            />
          )
        )}

        {/* Latitudlinjer */}
        {Array.from({ length: 6 }).map(
          (_, index) => (
            <line
              key={`lat-${index}`}
              x1="0"
              y1={index * 100}
              x2="1000"
              y2={index * 100}
              stroke="#93c5fd"
              strokeOpacity="0.12"
              strokeWidth="1"
            />
          )
        )}

        {/* Nordamerika */}
        <path
          d="M85 105 L135 78 L195 72 L242 92 L270 118 L254 151 L222 171 L211 206 L176 219 L143 199 L112 164 L78 142 Z"
          fill="url(#landGradient)"
          stroke="#86efac"
          strokeWidth="3"
          filter="url(#landShadow)"
        />

        {/* Centralamerika */}
        <path
          d="M207 205 L229 214 L245 232 L235 247 L214 239 L197 221 Z"
          fill="url(#landGradient)"
          stroke="#86efac"
          strokeWidth="2"
          filter="url(#landShadow)"
        />

        {/* Sydamerika */}
        <path
          d="M257 243 L303 252 L329 284 L323 326 L301 365 L286 414 L260 438 L245 400 L230 354 L216 313 L228 276 Z"
          fill="url(#landGradient)"
          stroke="#86efac"
          strokeWidth="3"
          filter="url(#landShadow)"
        />

        {/* Grönland */}
        <path
          d="M286 52 L332 38 L359 58 L345 96 L307 104 L282 79 Z"
          fill="#bbf7d0"
          stroke="#dcfce7"
          strokeWidth="2"
          filter="url(#landShadow)"
        />

        {/* Europa */}
        <path
          d="M442 118 L470 101 L507 108 L525 128 L510 146 L479 151 L456 141 Z"
          fill="url(#landGradient)"
          stroke="#86efac"
          strokeWidth="3"
          filter="url(#landShadow)"
        />

        {/* Afrika */}
        <path
          d="M462 157 L509 151 L548 181 L555 227 L533 280 L506 329 L475 312 L451 266 L438 212 Z"
          fill="url(#landGradient)"
          stroke="#86efac"
          strokeWidth="3"
          filter="url(#landShadow)"
        />

        {/* Asien */}
        <path
          d="M515 103 L580 77 L666 73 L749 91 L805 123 L793 157 L744 169 L714 196 L667 181 L635 155 L589 157 L552 138 Z"
          fill="url(#landGradient)"
          stroke="#86efac"
          strokeWidth="3"
          filter="url(#landShadow)"
        />

        {/* Indien */}
        <path
          d="M629 180 L661 188 L675 222 L653 260 L632 230 L615 201 Z"
          fill="url(#landGradient)"
          stroke="#86efac"
          strokeWidth="2"
          filter="url(#landShadow)"
        />

        {/* Sydostasien */}
        <path
          d="M704 190 L742 201 L768 224 L751 245 L721 229 L692 209 Z"
          fill="url(#landGradient)"
          stroke="#86efac"
          strokeWidth="2"
          filter="url(#landShadow)"
        />

        {/* Japan */}
        <path
          d="M812 142 L824 151 L817 177 L806 166 Z"
          fill="#4ade80"
          stroke="#86efac"
          strokeWidth="2"
        />

        {/* Australien */}
        <path
          d="M744 305 L797 286 L850 303 L872 337 L851 375 L800 388 L754 367 L728 336 Z"
          fill="url(#landGradient)"
          stroke="#86efac"
          strokeWidth="3"
          filter="url(#landShadow)"
        />

        {/* Antarktis */}
        <path
          d="M110 462 L220 445 L342 451 L458 440 L573 450 L690 442 L815 454 L910 465 L878 486 L738 490 L590 485 L432 492 L284 485 L151 489 Z"
          fill="#dbeafe"
          stroke="#eff6ff"
          strokeWidth="2"
          opacity="0.9"
        />

        {/* Ekvator */}
        <line
          x1="0"
          y1="250"
          x2="1000"
          y2="250"
          stroke="#fbbf24"
          strokeOpacity="0.35"
          strokeWidth="2"
          strokeDasharray="8 8"
        />
      </svg>

      <div
        className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
        style={{
          left: `${markerLeft}%`,
          top: `${markerTop}%`,
        }}
      >
        <div className="absolute h-14 w-14 animate-ping rounded-full bg-violet-400/25" />

        <div className="relative rounded-full border-2 border-white/70 bg-violet-500 p-2.5 text-white shadow-[0_0_24px_rgba(139,92,246,0.95)]">
          <Rocket size={20} />
        </div>
      </div>

      <div className="absolute bottom-3 left-3 z-10 rounded-lg border border-white/10 bg-slate-950/80 px-3 py-1.5 text-xs font-medium text-slate-200 backdrop-blur">
        ISS-position i realtid
      </div>

      <div className="absolute bottom-3 right-3 z-10 hidden rounded-lg border border-white/10 bg-slate-950/80 px-3 py-1.5 text-xs text-slate-300 backdrop-blur sm:block">
        Ekvator markerad i gult
      </div>
    </div>
  );
}

export default function FunDashboard() {
  const [data, setData] =
    useState<FunData | null>(null);
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
            Kontaktar yttre rymden…
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

  const visiblePlanets =
    data.planets.filter(
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
                Rymden
              </p>

              <h2 className="mt-2 text-3xl font-bold text-white">
                Utforska rymden
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Live-position för ISS, asteroider från
                NASA, månfaser och planetpositioner över
                Göteborg.
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
                <IssWorldMap
                  latitude={data.iss.latitude}
                  longitude={data.iss.longitude}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <StatBox
                    label="Position"
                    value={`${data.iss.latitude}°, ${data.iss.longitude}°`}
                  />

                  <StatBox
                    label="Höjd"
                    value={`${formatNumber(
                      data.iss.altitudeKm
                    )} km`}
                  />

                  <StatBox
                    label="Hastighet"
                    value={`${formatNumber(
                      data.iss.velocityKmh
                    )} km/h`}
                  />

                  <StatBox
                    label="Ljusförhållande"
                    value={
                      data.iss.visibility ===
                      "daylight"
                        ? "Dagsljus"
                        : data.iss.visibility ===
                            "eclipsed"
                          ? "Mörker"
                          : "Okänt"
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
                    data.asteroid.nearest
                      .hazardous
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
                      data.asteroid.nearest
                        .hazardous
                        ? "text-amber-200"
                        : "text-emerald-200",
                    ].join(" ")}
                  >
                    {data.asteroid.nearest
                      .hazardous
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
                      data.asteroid.nearest
                        .velocityKmh
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
              Planeternas läge just nu sett från
              Göteborg. Positiv höjd betyder att
              planeten är ovanför horisonten.
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
        </div>

        <p className="mt-5 text-center text-xs text-slate-500">
          Senast uppdaterad{" "}
          {new Date(
            data.generatedAt
          ).toLocaleTimeString("sv-SE", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </section>
  );
}