"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Waves,
} from "lucide-react";

import Card from "@/components/ui/Card";
import {
  BathingData,
  BathingPlace,
  formatBathingTemperature,
  getBathingTemperatureLevel,
} from "@/lib/bathing";

function getTemperatureStyle(
  place: BathingPlace
): string {
  if (place.warning) {
    return "border-red-400/30 bg-red-500/10";
  }

  const level = getBathingTemperatureLevel(
    place.temperature
  );

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

function getTemperatureBadge(
  place: BathingPlace
): string {
  if (place.warning) {
    return "bg-red-500/20 text-red-200";
  }

  const level = getBathingTemperatureLevel(
    place.temperature
  );

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
    loadBathingPlaces();
  }, []);

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
                onClick={loadBathingPlaces}
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

  const measuredPlaces =
    bathingData.places.filter(
      (place) => place.temperature !== null
    );

  const placesWithoutTemperature =
    bathingData.places.filter(
      (place) => place.temperature === null
    );

  const warmestPlace = measuredPlaces[0];

  return (
    <Card
      title="Badtemperaturer"
      icon={<Waves size={28} />}
      className="md:col-span-2 xl:col-span-1"
    >
      {warmestPlace && (
        <div className="mb-5 rounded-3xl border border-orange-300/20 bg-gradient-to-r from-orange-400/15 via-cyan-400/10 to-blue-500/10 p-5">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-orange-100">
            Varmast just nu
          </p>

          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-xl font-bold text-white">
                {warmestPlace.name}
              </p>

              <p className="mt-1 text-sm text-slate-300">
                Göteborg
              </p>
            </div>

            <p className="text-4xl font-bold text-white">
              {formatBathingTemperature(
                warmestPlace.temperature
              )}
            </p>
          </div>
        </div>
      )}

      <div className="mb-4">
        <p className="font-semibold text-white">
          Göteborgs badplatser
        </p>

        <p className="mt-1 text-sm text-slate-400">
          Sorterade från varmast till kallast
        </p>
      </div>

      <div className="max-h-[36rem] space-y-3 overflow-y-auto pr-1">
        {measuredPlaces.map((place, index) => (
          <article
            key={place.name}
            className={`rounded-2xl border p-4 ${getTemperatureStyle(
              place
            )}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-bold text-white">
                  {index + 1}
                </div>

                <div className="min-w-0">
                  <p className="font-semibold text-white">
                    {place.name}
                  </p>

                  {place.warning ? (
                    <p className="mt-1 text-sm font-medium text-red-200">
                      ⚠️ {place.warning}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-400">
                      Ingen aktuell badavrådan
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-2">
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
                    className="flex items-center gap-1 text-xs text-slate-400 transition hover:text-white"
                  >
                    Mer info
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          </article>
        ))}

        {placesWithoutTemperature.length > 0 && (
          <div className="pt-3">
            <p className="mb-3 text-sm font-medium text-slate-400">
              Saknar aktuell temperatur
            </p>

            {placesWithoutTemperature.map(
              (place) => (
                <div
                  key={place.name}
                  className="mb-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-300">
                      {place.name}
                    </p>

                    <span className="text-xs text-slate-500">
                      Ingen mätning
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Källa: Havs- och vattenmyndigheten.
        Temperaturer och badavrådan kan ändras.
      </p>
    </Card>
  );
}