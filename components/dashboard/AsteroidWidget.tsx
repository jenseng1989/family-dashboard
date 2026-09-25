"use client";

import {
  AlertTriangle,
  LoaderCircle,
  Orbit,
  RefreshCw,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import Card from "@/components/ui/Card";

type AsteroidNearest = {
  name: string;
  hazardous: boolean;
  diameterMeters: number;
  lunarDistances: number;
  velocityKmh: number;
  approachDate: string;
};

type AsteroidData = {
  nearest: AsteroidNearest | null;
  totalThisWeek: number;
};

type FunData = {
  asteroid: AsteroidData | null;
  errors: {
    iss: string | null;
    asteroid: string | null;
  };
};

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
    <div className="rounded-2xl border border-violet-300/10 bg-slate-950/35 p-3.5 sm:p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300/80">
        {label}
      </p>

      <p className="mt-2 text-base font-bold text-white sm:text-lg">
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

export default function AsteroidWidget() {
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
        "Kunde inte hämta asteroiddata:",
        error
      );

      setErrorMessage(
        "Asteroiddata kunde inte hämtas."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <Card
      title="Asteroidvarning"
      icon={<Orbit size={28} />}
      className="h-full border-violet-300/15 bg-slate-950/55 hover:bg-slate-950/70"
      storageKey="space-asteroids"
    >
      {isLoading && !data ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03]">
          <LoaderCircle
            size={28}
            className="animate-spin text-violet-300"
          />
          <p className="text-sm text-slate-400">
            Hämtar asteroiddata…
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
                {errorMessage ?? "Asteroiddata saknas."}
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
      ) : data.asteroid?.nearest ? (
        <div>
          <div
            className={[
              "rounded-2xl border p-4 sm:p-5",
              data.asteroid.nearest.hazardous
                ? "border-amber-300/25 bg-amber-400/10"
                : "border-emerald-300/20 bg-emerald-400/10",
            ].join(" ")}
          >
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400 sm:text-sm sm:tracking-[0.18em]">
              Närmaste passage kommande sju dagar
            </p>

            <h3 className="mt-2 break-words text-xl font-bold text-white sm:text-2xl">
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

          <div className="mt-4 grid gap-2.5 sm:grid-cols-2 sm:gap-3">
            <StatBox
              label="Uppskattad diameter"
              value={`${formatNumber(
                data.asteroid.nearest.diameterMeters
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
                data.asteroid.nearest.approachDate
              }
            />
          </div>

          <p className="mt-4 text-xs text-slate-500">
            NASA listar totalt{" "}
            {data.asteroid.totalThisWeek}{" "}
            objekt under perioden.
          </p>
        </div>
      ) : (
        <SpaceError
          message={
            data.errors?.asteroid ||
            "Asteroiddata saknas."
          }
        />
      )}
    </Card>
  );
}
