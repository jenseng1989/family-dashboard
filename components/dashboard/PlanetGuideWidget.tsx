"use client";

import {
  AlertTriangle,
  LoaderCircle,
  RefreshCw,
  Telescope,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Card from "@/components/ui/Card";

type PlanetData = {
  name: string;
  emoji: string;
  altitude: number;
  azimuth: number;
  direction: string;
  magnitude: number;
  visible: boolean;
};

type FunData = {
  planets: PlanetData[];
};

export default function PlanetGuideWidget() {
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
      const response = await fetch(
        "/api/fun",
        {
          cache: "no-store",
        }
      );

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
        "Kunde inte hämta planetdata:",
        error
      );

      setErrorMessage(
        "Planetdata kunde inte hämtas."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const visiblePlanets = useMemo(
    () =>
      data?.planets.filter(
        (planet) => planet.visible
      ) ?? [],
    [data]
  );

  return (
    <Card
      title="Planetguide"
      icon={<Telescope size={28} />}
      className="h-full border-violet-300/15 bg-slate-950/55 hover:bg-slate-950/70"
      storageKey="space-planets"
    >
      {isLoading && !data ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03]">
          <LoaderCircle
            size={28}
            className="animate-spin text-violet-300"
          />
          <p className="text-sm text-slate-400">
            Hämtar planetdata…
          </p>
        </div>
      ) : errorMessage || !data ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={22}
              className="mt-0.5 shrink-0 text-red-300"
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-red-200">
                {errorMessage ?? "Planetdata saknas."}
              </p>

              <button
                type="button"
                onClick={() => void loadData()}
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
          <p className="mb-3 text-sm leading-6 text-slate-400 sm:mb-4">
            Planeternas läge just nu sett från
            Göteborg. Positiv höjd betyder att
            planeten är ovanför horisonten.
          </p>

          <div className="grid gap-3">
            {data.planets.map(
              (planet) => (
                <div
                  key={planet.name}
                  className={[
                    "flex items-center gap-3 rounded-2xl border p-3.5 sm:gap-4 sm:p-4",
                    planet.visible
                      ? "border-violet-300/15 bg-violet-400/10"
                      : "border-white/5 bg-white/[0.03] opacity-65",
                  ].join(" ")}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950/50 text-xl text-violet-200 sm:h-11 sm:w-11 sm:text-2xl">
                    {planet.emoji}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-white">
                        {planet.name}
                      </p>

                      <span
                        className={[
                          "rounded-full px-2 py-1 text-[11px] font-semibold sm:px-2.5 sm:text-xs",
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

                    <p className="mt-1 text-xs leading-5 text-slate-400 sm:text-sm">
                      {planet.altitude}° höjd ·{" "}
                      {planet.direction} · magnitud{" "}
                      {planet.magnitude}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>

          <p className="mt-4 text-xs text-slate-500">
            {visiblePlanets.length} av{" "}
            {data.planets.length} planeter är
            ovanför horisonten just nu. Moln och
            dagsljus kan ändå göra dem osynliga.
          </p>
        </>
      )}
    </Card>
  );
}
