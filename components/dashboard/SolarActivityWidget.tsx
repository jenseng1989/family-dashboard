"use client";

import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Gauge,
  LoaderCircle,
  Magnet,
  RefreshCw,
  Sparkles,
  Sun,
  Wind,
  Zap,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import Card from "@/components/ui/Card";

type SpaceWeatherLevel =
  | "Lugn"
  | "Förhöjd"
  | "Geomagnetisk storm"
  | "Kraftig storm"
  | "Mycket kraftig storm"
  | "Extrem storm";

type ForecastPoint = {
  time: string;
  kp: number;
};

type SpaceWeatherData = {
  kpIndex: number;
  maxKp24h: number;
  forecastKp: number | null;
  maxForecastKp: number | null;
  forecast: ForecastPoint[];
  level: SpaceWeatherLevel;
  stormScale: string;
  stormDescription: string;
  trend: "Stiger" | "Stabil" | "Sjunker";
  solarWindSpeed: number | null;
  solarWindStatus: string;
  protonDensity: number | null;
  protonDensityStatus: string;
  bz: number | null;
  bzStatus: string;
  bt: number | null;
  btStatus: string;
  auroraChance: string;
  auroraStars: number;
  auroraExplanation: string;
  updatedAt: string;
  solarWindUpdatedAt: string | null;
  magneticFieldUpdatedAt: string | null;
  source: string;
};

function getLevelClasses(
  level: SpaceWeatherLevel
): string {
  switch (level) {
    case "Extrem storm":
      return "border-red-400/25 bg-red-400/10 text-red-200";
    case "Mycket kraftig storm":
      return "border-orange-400/25 bg-orange-400/10 text-orange-200";
    case "Kraftig storm":
      return "border-amber-400/25 bg-amber-400/10 text-amber-200";
    case "Geomagnetisk storm":
      return "border-yellow-300/25 bg-yellow-300/10 text-yellow-200";
    case "Förhöjd":
      return "border-blue-400/20 bg-blue-400/10 text-blue-200";
    case "Lugn":
    default:
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }
}

function getKpInterpretation(kp: number): string {
  if (kp >= 8) return "Mycket kraftig geomagnetisk aktivitet";
  if (kp >= 7) return "Kraftig geomagnetisk storm";
  if (kp >= 5) return "Geomagnetisk storm";
  if (kp >= 4) return "Förhöjd geomagnetisk aktivitet";
  return "Lugn geomagnetisk aktivitet";
}

function getSolarWindInterpretation(speed: number | null): string {
  if (speed === null) return "Ingen aktuell mätning";
  if (speed >= 700) return "Mycket hög solvind";
  if (speed >= 600) return "Hög solvind";
  if (speed >= 500) return "Förhöjd solvind";
  return "Normal till lugn solvind";
}

function getBzInterpretation(bz: number | null): string {
  if (bz === null) return "Ingen aktuell mätning";
  if (bz <= -10) return "Mycket gynnsamt för geomagnetisk koppling";
  if (bz <= -5) return "Gynnsamt för norrsken";
  if (bz < 0) return "Svagt gynnsam riktning";
  if (bz >= 5) return "Ogynnsam riktning för norrsken";
  return "Neutral till svagt ogynnsam riktning";
}

function getBtInterpretation(bt: number | null): string {
  if (bt === null) return "Ingen aktuell mätning";
  if (bt >= 20) return "Mycket starkt interplanetärt magnetfält";
  if (bt >= 10) return "Förstärkt interplanetärt magnetfält";
  return "Normalt till måttligt magnetfält";
}

function getDensityInterpretation(density: number | null): string {
  if (density === null) return "Ingen aktuell mätning";
  if (density >= 20) return "Mycket hög protontäthet";
  if (density >= 10) return "Förhöjd protontäthet";
  if (density >= 5) return "Måttlig protontäthet";
  return "Låg protontäthet";
}

function getPlainLanguageSummary(data: SpaceWeatherData): string {
  const parts: string[] = [];

  if (data.kpIndex >= 5) parts.push("geomagnetisk storm pågår");
  else if (data.kpIndex >= 4) parts.push("den geomagnetiska aktiviteten är förhöjd");
  else parts.push("den geomagnetiska aktiviteten är relativt lugn");

  if (data.bz !== null && data.bz <= -5) parts.push("Bz är tydligt sydlig och gynnsam för norrsken");
  else if (data.bz !== null && data.bz < 0) parts.push("Bz är sydlig och något gynnsam");
  else if (data.bz !== null) parts.push("Bz är inte särskilt gynnsam just nu");

  if (data.solarWindSpeed !== null && data.solarWindSpeed >= 600) parts.push("solvinden är hög");
  else if (data.solarWindSpeed !== null && data.solarWindSpeed >= 500) parts.push("solvinden är förhöjd");

  const sentence = parts.join(", ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
}

function renderStars(
  stars: number
): string {
  const safeStars =
    Math.min(
      5,
      Math.max(
        0,
        stars
      )
    );

  return `${"★".repeat(
    safeStars
  )}${"☆".repeat(
    5 - safeStars
  )}`;
}

function formatTime(
  value: string | null
): string {
  if (!value) {
    return "Okänt";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Okänt";
  }

  return date.toLocaleString(
    "sv-SE",
    {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function formatForecastTime(
  value: string
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
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

function TrendIcon({
  trend,
}: {
  trend:
    SpaceWeatherData["trend"];
}) {
  if (trend === "Stiger") {
    return (
      <ArrowUp
        size={18}
      />
    );
  }

  if (trend === "Sjunker") {
    return (
      <ArrowDown
        size={18}
      />
    );
  }

  return (
    <ArrowRight
      size={18}
    />
  );
}

function SpaceStat({
  icon,
  label,
  value,
  description,
  interpretation,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
  interpretation?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-4",
        highlight
          ? "border-emerald-300/20 bg-emerald-400/[0.07]"
          : "border-violet-300/10 bg-slate-950/35",
      ].join(" ")}
    >
      <div
        className={[
          "flex items-center gap-2",
          highlight
            ? "text-emerald-300"
            : "text-violet-300",
        ].join(" ")}
      >
        {icon}

        <p className="text-xs font-semibold uppercase tracking-[0.16em]">
          {label}
        </p>
      </div>

      <p className="mt-3 text-2xl font-bold text-white">
        {value}
      </p>

      {interpretation && (
        <p className="mt-2 text-sm font-semibold text-slate-300">
          {interpretation}
        </p>
      )}

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export default function SolarActivityWidget() {
  const [data, setData] =
    useState<SpaceWeatherData | null>(
      null
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(
      null
    );

  const loadData =
    useCallback(async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response =
          await fetch(
            "/api/space-weather",
            {
              cache:
                "no-store",
            }
          );

        if (!response.ok) {
          throw new Error(
            `API-fel ${response.status}`
          );
        }

        const result =
          (await response.json()) as SpaceWeatherData;

        setData(result);
      } catch (error) {
        console.error(
          "Kunde inte hämta rymdväder:",
          error
        );

        setErrorMessage(
          "Rymdväderdata kunde inte hämtas."
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
        10 * 60 * 1000
      );

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, [loadData]);

  const bzIsFavourable =
    data?.bz !== null &&
    data?.bz !== undefined &&
    data.bz < 0;

  return (
    <Card
      title="Rymdväder"
      icon={<Sun size={28} />}
      className="border-orange-300/15 bg-slate-950/55 hover:bg-slate-950/70"
      storageKey="solar-activity"
    >
      {isLoading ? (
        <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03]">
          <LoaderCircle
            size={30}
            className="animate-spin text-orange-300"
          />

          <p className="text-sm text-slate-400">
            Kontaktar solen…
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

            <div className="min-w-0 flex-1">
              <p className="font-semibold text-red-200">
                {errorMessage ??
                  "Rymdväderdata saknas."}
              </p>

              <button
                type="button"
                onClick={() =>
                  void loadData()
                }
                className="mt-4 flex items-center gap-2 rounded-xl border border-red-300/20 bg-red-300/10 px-3 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-300/20"
              >
                <RefreshCw size={16} />
                Försök igen
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <section className="relative overflow-hidden rounded-2xl border border-orange-300/15 bg-gradient-to-br from-orange-400/15 via-amber-300/[0.06] to-red-500/[0.06] p-5">
              <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-orange-400/15 blur-3xl" />

              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">
                      Rymdväder
                    </p>

                    <h3 className="mt-2 text-2xl font-bold text-white">
                      {data.level}
                    </h3>
                  </div>

                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-orange-200/20 bg-orange-400/15 text-orange-300 shadow-[0_0_30px_rgba(251,146,60,0.18)]">
                    <Sun
                      size={31}
                    />
                  </div>
                </div>

                <div
                  className={[
                    "mt-5 inline-flex rounded-full border px-3 py-1.5 text-sm font-semibold",
                    getLevelClasses(
                      data.level
                    ),
                  ].join(" ")}
                >
                  {data.stormScale}
                </div>

                <p className="mt-3 text-sm font-medium text-slate-300">
                  {data.stormDescription}
                </p>

                <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/30 px-3 py-2.5 text-sm text-slate-300">
                  <TrendIcon
                    trend={
                      data.trend
                    }
                  />

                  <span>
                    Aktiviteten{" "}
                    {data.trend.toLowerCase()}
                  </span>
                </div>
              </div>
            </section>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <SpaceStat
                icon={
                  <Gauge
                    size={18}
                  />
                }
                label="Kp-index"
                value={String(
                  data.kpIndex
                )}
                interpretation={getKpInterpretation(data.kpIndex)}
                description={`Högsta senaste dygnet: ${data.maxKp24h}`}
              />

              <SpaceStat
                icon={
                  <Wind
                    size={18}
                  />
                }
                label="Solvind"
                value={
                  data.solarWindSpeed !==
                  null
                    ? `${data.solarWindSpeed} km/s`
                    : "–"
                }
                interpretation={getSolarWindInterpretation(data.solarWindSpeed)}
                description={
                  data.solarWindStatus
                }
              />

              <SpaceStat
                icon={
                  <Magnet
                    size={18}
                  />
                }
                label="IMF Bz"
                value={
                  data.bz !==
                  null
                    ? `${data.bz} nT`
                    : "–"
                }
                interpretation={getBzInterpretation(data.bz)}
                description={
                  data.bzStatus
                }
                highlight={
                  bzIsFavourable
                }
              />

              <SpaceStat
                icon={
                  <Magnet
                    size={18}
                  />
                }
                label="Magnetfält Bt"
                value={
                  data.bt !==
                  null
                    ? `${data.bt} nT`
                    : "–"
                }
                interpretation={getBtInterpretation(data.bt)}
                description={
                  data.btStatus
                }
              />

              <SpaceStat
                icon={
                  <Activity
                    size={18}
                  />
                }
                label="Protontäthet"
                value={
                  data.protonDensity !==
                  null
                    ? `${data.protonDensity} p/cm³`
                    : "–"
                }
                interpretation={getDensityInterpretation(data.protonDensity)}
                description={
                  data.protonDensityStatus
                }
              />

              <SpaceStat
                icon={
                  <Zap
                    size={18}
                  />
                }
                label="Stormskala"
                value={
                  data.stormScale
                }
                description={
                  data.stormDescription
                }
              />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-sky-300/15 bg-sky-400/[0.06] p-5">
            <div className="flex items-start gap-3">
              <Sparkles size={22} className="mt-0.5 shrink-0 text-sky-300" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.17em] text-sky-300">
                  Sammanfattning
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-white">
                  {getPlainLanguageSummary(data)}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  En förenklad tolkning av Kp-index, Bz och solvind för att göra mätvärdena lättare att förstå.
                </p>
              </div>
            </div>
          </div>

          <div
            className={[
              "mt-4 rounded-2xl border p-5",
              bzIsFavourable
                ? "border-emerald-300/20 bg-emerald-400/[0.07]"
                : "border-violet-300/10 bg-violet-400/[0.05]",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <Magnet
                size={22}
                className={
                  bzIsFavourable
                    ? "mt-0.5 shrink-0 text-emerald-300"
                    : "mt-0.5 shrink-0 text-violet-300"
                }
              />

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.17em] text-slate-400">
                  Bz just nu
                </p>

                <p className="mt-2 text-xl font-bold text-white">
                  {data.bz !== null
                    ? `${data.bz} nT · ${data.bzStatus}`
                    : "Ingen Bz-data"}
                </p>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Negativ Bz betyder att solvindens magnetfält är riktat söderut, vilket ofta är gynnsamt för energiöverföring till jordens magnetosfär och därmed för norrsken.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-300/10 bg-emerald-400/[0.06] p-5">
            <div className="flex items-start gap-3">
              <Sparkles
                size={22}
                className="mt-0.5 shrink-0 text-emerald-300"
              />

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.17em] text-emerald-300">
                  Norrskenschans i Göteborg
                </p>

                <p className="mt-2 text-xl font-bold text-white">
                  {data.auroraChance}
                </p>

                <p className="mt-2 font-mono text-xl tracking-widest text-emerald-300">
                  {renderStars(
                    data.auroraStars
                  )}
                </p>

                <p className="mt-3 text-xs leading-5 text-slate-400">
                  {data.auroraExplanation}
                </p>

                <p className="mt-2 text-[11px] leading-5 text-slate-500">
                  Bedömningen är en förenklad indikator för dashboarden och inte en officiell lokal NOAA-prognos.
                </p>
              </div>
            </div>
          </div>

          {data.forecast.length >
            0 && (
            <section className="mt-4 rounded-2xl border border-violet-300/10 bg-slate-950/35 p-5">
              <div className="flex items-center gap-2">
                <Activity
                  size={19}
                  className="text-violet-300"
                />

                <div>
                  <p className="font-semibold text-white">
                    Kp-prognos
                  </p>

                  <p className="text-xs text-slate-500">
                    Kommande NOAA-prognospunkter
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {data.forecast
                  .slice(0, 8)
                  .map(
                    (
                      point
                    ) => (
                      <div
                        key={`${point.time}-${point.kp}`}
                        className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center"
                      >
                        <p className="text-xs text-slate-500">
                          {formatForecastTime(
                            point.time
                          )}
                        </p>

                        <p className="mt-1 text-xl font-bold text-white">
                          Kp{" "}
                          {
                            point.kp
                          }
                        </p>
                      </div>
                    )
                  )}
              </div>
            </section>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-blue-300">
                <Wind
                  size={17}
                />

                <p className="text-sm font-semibold">
                  Solvind
                </p>
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Hög solvindshastighet kan förstärka geomagnetisk aktivitet när magnetfältets riktning samtidigt är gynnsam.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-emerald-300">
                <Magnet
                  size={17}
                />

                <p className="text-sm font-semibold">
                  Bz
                </p>
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Sydlig, negativ Bz är en av de viktigaste realtidsparametrarna när man bedömer om solvinden effektivt kan påverka jordens magnetfält.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-violet-300">
                <Activity
                  size={17}
                />

                <p className="text-sm font-semibold">
                  Protontäthet
                </p>
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Tätheten visar hur många protoner solvinden innehåller. Snabba förändringar kan signalera att en störning når området nära jorden.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-1 border-t border-white/10 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Data: {data.source}
            </span>

            <span>
              Uppdaterad{" "}
              {formatTime(
                data.updatedAt
              )}
            </span>
          </div>
        </>
      )}
    </Card>
  );
}