"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Thermometer,
  Waves,
} from "lucide-react";

import Card from "@/components/ui/Card";
import {
  BathingData,
  BathingPlace,
  formatBathingTemperature,
  getBathingTemperatureLevel,
} from "@/lib/bathing";

function getTemperatureStyle(place: BathingPlace): string {
  if (place.warning) {
    return "border-red-400/30 bg-red-500/10";
  }

  const level = getBathingTemperatureLevel(place.temperature);

  if (level === "warm") {
    return "border-orange-300/25 bg-orange-400/10";
  }

  if (level === "medium") {
    return "border-cyan-300/25 bg-cyan-400/10";
  }

  if (level === "cold") {
    return "border-blue-300/25 bg-blue-500/10";
  }

  return "border-white/10 bg-white/5";
}

function getTemperatureBadge(place: BathingPlace): string {
  if (place.warning) {
    return "bg-red-500/20 text-red-200";
  }

  const level = getBathingTemperatureLevel(place.temperature);

  if (level === "warm") {
    return "bg-orange-400/20 text-orange-100";
  }

  if (level === "medium") {
    return "bg-cyan-400/20 text-cyan-100";
  }

  if (level === "cold") {
    return "bg-blue-500/20 text-blue-100";
  }

  return "bg-white/10 text-slate-300";
}

function getTemperatureLabel(
  temperature: number | null
): string {
  const level = getBathingTemperatureLevel(temperature);

  if (level === "warm") {
    return "Varmt";
  }

  if (level === "medium") {
    return "Skönt";
  }

  if (level === "cold") {
    if (temperature !== null && temperature < 14) {
      return "Kallt";
    }

    return "Svalt";
  }

  return "Ingen mätning";
}

function getTemperatureLabelClasses(
  temperature: number | null
): string {
  const level = getBathingTemperatureLevel(temperature);

  if (level === "warm") {
    return "text-orange-200";
  }

  if (level === "medium") {
    return "text-cyan-200";
  }

  if (level === "cold") {
    return "text-blue-200";
  }

  return "text-slate-500";
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "–";
  }

  return date.toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BathingWidget() {
  const [bathingData, setBathingData] =
    useState<BathingData | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  async function loadBathingPlaces() {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/bathing", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Kunde inte hämta badtemperaturerna"
        );
      }

      if (!Array.isArray(data.places)) {
        throw new Error(
          "Badtemperatur-API:t gav ett oväntat svar"
        );
      }

      setBathingData(data as BathingData);
    } catch (caughtError) {
      setBathingData(null);

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Ett okänt fel uppstod"
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadBathingPlaces();
  }, []);

  const measuredPlaces = useMemo(
    () =>
      bathingData?.places.filter(
        (place) => place.temperature !== null
      ) ?? [],
    [bathingData]
  );

  const placesWithoutTemperature = useMemo(
    () =>
      bathingData?.places.filter(
        (place) => place.temperature === null
      ) ?? [],
    [bathingData]
  );

  const recommendedPlace = useMemo(
    () =>
      measuredPlaces.find((place) => !place.warning) ??
      null,
    [measuredPlaces]
  );

  const warningCount = useMemo(
    () =>
      bathingData?.places.filter(
        (place) => Boolean(place.warning)
      ).length ?? 0,
    [bathingData]
  );

  const warmCount = useMemo(
    () =>
      measuredPlaces.filter(
        (place) =>
          place.temperature !== null &&
          place.temperature >= 20
      ).length,
    [measuredPlaces]
  );

  if (isLoading) {
    return (
      <Card
        title="Badtemperaturer"
        icon={<Waves size={28} />}
        className="md:col-span-2 xl:col-span-1"
      >
        <div className="flex min-h-44 items-center justify-center gap-3 text-slate-300">
          <RefreshCw
            className="animate-spin"
            size={22}
          />

          <p>Hämtar badtemperaturer...</p>
        </div>
      </Card>
    );
  }

  if (error || !bathingData) {
    return (
      <Card
        title="Badtemperaturer"
        icon={<Waves size={28} />}
        className="md:col-span-2 xl:col-span-1"
      >
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 shrink-0 text-red-300"
              size={22}
            />

            <div>
              <p className="font-semibold text-white">
                Badtemperaturerna kunde inte hämtas
              </p>

              <p className="mt-1 text-sm text-slate-300">
                {error ?? "Okänt fel"}
              </p>

              <button
                type="button"
                onClick={() => void loadBathingPlaces()}
                className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
              >
                Försök igen
              </button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Badtemperaturer"
      icon={<Waves size={28} />}
      className="md:col-span-2 xl:col-span-1"
    >
      {recommendedPlace && (
        <div className="overflow-hidden rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-cyan-400/[0.14] via-blue-400/[0.07] to-slate-950/20 p-5">
          <div className="flex items-center gap-2 text-cyan-200">
            <ShieldCheck size={17} />
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">
              Bäst för ett dopp
            </p>
          </div>

          <div className="mt-4 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-xl font-bold text-white">
                {recommendedPlace.name}
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Högst temperatur utan aktuell badavrådan
              </p>

              <p
                className={`mt-2 text-sm font-semibold ${getTemperatureLabelClasses(
                  recommendedPlace.temperature
                )}`}
              >
                {getTemperatureLabel(
                  recommendedPlace.temperature
                )}
              </p>
            </div>

            <p className="shrink-0 text-4xl font-black text-white">
              {formatBathingTemperature(
                recommendedPlace.temperature
              )}
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Mätningar
          </p>
          <p className="mt-1 text-xl font-bold text-white">
            {measuredPlaces.length}
          </p>
        </div>

        <div className="rounded-2xl border border-orange-300/15 bg-orange-400/[0.05] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-orange-300">
            ≥ 20 °C
          </p>
          <p className="mt-1 text-xl font-bold text-white">
            {warmCount}
          </p>
        </div>

        <div
          className={[
            "rounded-2xl border p-3",
            warningCount > 0
              ? "border-red-300/20 bg-red-400/[0.07]"
              : "border-emerald-300/15 bg-emerald-400/[0.05]",
          ].join(" ")}
        >
          <p
            className={[
              "text-[10px] font-semibold uppercase tracking-[0.12em]",
              warningCount > 0
                ? "text-red-300"
                : "text-emerald-300",
            ].join(" ")}
          >
            Avrådan
          </p>
          <p className="mt-1 text-xl font-bold text-white">
            {warningCount}
          </p>
        </div>
      </div>

      <div className="mb-3 mt-5">
        <p className="font-semibold text-white">
          Göteborgs badplatser
        </p>

        <p className="mt-1 text-sm text-slate-400">
          Sorterade från varmast till kallast
        </p>
      </div>

      <div className="max-h-[36rem] space-y-2 overflow-y-auto pr-1">
        {measuredPlaces.map((place, index) => (
          <article
            key={place.name}
            className={`rounded-2xl border px-3 py-3 ${getTemperatureStyle(
              place
            )}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xs font-bold text-white">
                  {index + 1}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {place.name}
                  </p>

                  {place.warning ? (
                    <p className="mt-1 text-xs font-semibold text-red-200">
                      ⚠️ {place.warning}
                    </p>
                  ) : (
                    <p
                      className={`mt-1 text-xs font-semibold ${getTemperatureLabelClasses(
                        place.temperature
                      )}`}
                    >
                      {getTemperatureLabel(
                        place.temperature
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-sm font-bold ${getTemperatureBadge(
                    place
                  )}`}
                >
                  {formatBathingTemperature(
                    place.temperature
                  )}
                </span>

                {place.url && (
                  <a
                    href={place.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Mer information om ${place.name}`}
                    title="Mer info"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-slate-400 transition hover:bg-white/10 hover:text-white"
                  >
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            </div>
          </article>
        ))}

        {placesWithoutTemperature.length > 0 && (
          <div className="pt-3">
            <p className="mb-2 text-sm font-medium text-slate-400">
              Saknar aktuell temperatur
            </p>

            {placesWithoutTemperature.map((place) => (
              <div
                key={place.name}
                className="mb-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm text-slate-300">
                    {place.name}
                  </p>

                  <span className="shrink-0 text-xs text-slate-500">
                    Ingen mätning
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-1.5">
          <Thermometer size={13} />
          Uppdaterad {formatUpdatedAt(bathingData.updatedAt)}
        </span>

        <span>
          Källa: Havs- och vattenmyndigheten
        </span>
      </div>
    </Card>
  );
}
