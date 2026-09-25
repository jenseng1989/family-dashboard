"use client";

import {
  AlertTriangle,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import Card from "@/components/ui/Card";

type MoonData = {
  phaseName: string;
  emoji: string;
  illuminatedPercent: number;
  phaseAngle: number;
  nextFullMoon: string | null;
  nextNewMoon: string | null;
};

type FunData = {
  moon: MoonData;
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

export default function MoonWidget() {
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
        "Kunde inte hämta måndata:",
        error
      );

      setErrorMessage(
        "Måndata kunde inte hämtas."
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
      title="Månfaser"
      icon={
        <span className="text-2xl">
          {data?.moon?.emoji ?? "🌙"}
        </span>
      }
      className="h-full border-violet-300/15 bg-slate-950/55 hover:bg-slate-950/70"
      storageKey="space-moon"
    >
      {isLoading && !data ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03]">
          <LoaderCircle
            size={28}
            className="animate-spin text-violet-300"
          />
          <p className="text-sm text-slate-400">
            Hämtar månfaser…
          </p>
        </div>
      ) : errorMessage || !data?.moon ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={22}
              className="mt-0.5 shrink-0 text-red-300"
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-red-200">
                {errorMessage ?? "Måndata saknas."}
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
        </>
      )}
    </Card>
  );
}
