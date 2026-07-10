"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Clock3,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

import Card from "@/components/ui/Card";
import {
  ElectricityData,
  ElectricityPrice,
  formatHour,
  formatPrice,
} from "@/lib/electricity";

type CheapestPeriod = {
  startTime: string;
  endTime: string;
  averagePrice: number;
};

function findCheapestThreeHourPeriod(
  prices: ElectricityPrice[]
): CheapestPeriod | null {
  if (prices.length < 3) {
    return null;
  }

  let cheapestPeriod: CheapestPeriod | null = null;

  for (let index = 0; index <= prices.length - 3; index += 1) {
    const period = prices.slice(index, index + 3);

    const averagePrice =
      period.reduce((sum, price) => sum + price.SEK_per_kWh, 0) /
      period.length;

    if (
      cheapestPeriod === null ||
      averagePrice < cheapestPeriod.averagePrice
    ) {
      cheapestPeriod = {
        startTime: period[0].time_start,
        endTime: period[period.length - 1].time_end,
        averagePrice,
      };
    }
  }

  return cheapestPeriod;
}

export default function ElectricityWidget() {
  const [electricity, setElectricity] = useState<ElectricityData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadElectricity() {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/electricity", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Kunde inte hämta elpriser");
      }

      if (!Array.isArray(data.prices)) {
        throw new Error("Elpris-API:t returnerade ett oväntat svar");
      }

      setElectricity(data as ElectricityData);
    } catch (caughtError) {
      setElectricity(null);

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
    loadElectricity();
  }, []);

  const chartData = useMemo(() => {
    if (!electricity) {
      return [];
    }

    return electricity.prices.map((price) => ({
      hour: formatHour(price.time_start),
      price: Number(price.SEK_per_kWh.toFixed(2)),
    }));
  }, [electricity]);

  const cheapestThreeHours = useMemo(() => {
    if (!electricity) {
      return null;
    }

    return findCheapestThreeHourPeriod(electricity.prices);
  }, [electricity]);

  if (isLoading) {
    return (
      <Card
        title="Elpris"
        icon={<Zap size={28} />}
        className="md:col-span-2 xl:col-span-2"
      >
        <div className="flex min-h-40 items-center justify-center gap-3 text-slate-300">
          <RefreshCw className="animate-spin" size={22} />
          <p>Hämtar dagens elpriser...</p>
        </div>
      </Card>
    );
  }

  if (error || !electricity) {
    return (
      <Card
        title="Elpris"
        icon={<Zap size={28} />}
        className="md:col-span-2 xl:col-span-2"
      >
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 text-red-300" size={22} />

            <div>
              <p className="font-semibold text-white">
                Elpriserna kunde inte hämtas
              </p>

              <p className="mt-1 text-sm text-slate-300">
                {error ?? "Okänt fel"}
              </p>

              <button
                type="button"
                onClick={loadElectricity}
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

  const timeTicks = [
    "00:00",
    "03:00",
    "06:00",
    "09:00",
    "12:00",
    "15:00",
    "18:00",
    "21:00",
  ];

  const currentTime = electricity.currentPrice
    ? formatHour(electricity.currentPrice.time_start)
    : undefined;

  return (
    <Card
      title="Elpris"
      icon={<Zap size={28} />}
      className="md:col-span-2 xl:col-span-2"
    >
      {/* Översikt */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4">
          <div className="flex items-center gap-2 text-blue-200">
            <Zap size={17} />
            <p className="text-sm">Just nu</p>
          </div>

          <p className="mt-2 text-3xl font-bold text-white">
            {electricity.currentPrice
              ? `${formatPrice(
                  electricity.currentPrice.SEK_per_kWh
                )} kr`
              : "-- kr"}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            per kWh · {electricity.area}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
          <div className="flex items-center gap-2 text-emerald-200">
            <TrendingDown size={17} />
            <p className="text-sm">Billigast</p>
          </div>

          <p className="mt-2 text-2xl font-bold text-white">
            {formatPrice(electricity.minPrice.SEK_per_kWh)} kr
          </p>

          <p className="mt-1 text-xs text-slate-400">
            från {formatHour(electricity.minPrice.time_start)}
          </p>
        </div>

        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4">
          <div className="flex items-center gap-2 text-red-200">
            <TrendingUp size={17} />
            <p className="text-sm">Dyrast</p>
          </div>

          <p className="mt-2 text-2xl font-bold text-white">
            {formatPrice(electricity.maxPrice.SEK_per_kWh)} kr
          </p>

          <p className="mt-1 text-xs text-slate-400">
            från {formatHour(electricity.maxPrice.time_start)}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-slate-300">
            <Clock3 size={17} />
            <p className="text-sm">Dagens snitt</p>
          </div>

          <p className="mt-2 text-2xl font-bold text-white">
            {formatPrice(electricity.averagePrice)} kr
          </p>

          <p className="mt-1 text-xs text-slate-400">per kWh</p>
        </div>
      </div>

      {/* Graf */}
      <div className="mt-6">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-semibold text-white">Pris under dagen</h3>
            <p className="text-sm text-slate-400">
              Timpris i kronor per kWh
            </p>
          </div>

          <span className="w-fit rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-200">
            {electricity.area}
          </span>
        </div>

        <div className="h-72 rounded-2xl border border-white/10 bg-slate-950/20 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 24,
                right: 18,
                left: -8,
                bottom: 8,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.08)"
                vertical={false}
              />

              <XAxis
                dataKey="hour"
                ticks={timeTicks}
                interval={0}
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                minTickGap={12}
              />

              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={42}
                tickFormatter={(value: number) =>
                  value.toFixed(1).replace(".", ",")
                }
              />

              <Tooltip
                cursor={{
                  stroke: "rgba(255,255,255,0.2)",
                  strokeDasharray: "4 4",
                }}
                contentStyle={{
                  background: "#020617",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "16px",
                  color: "white",
                  boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
                }}
                labelStyle={{
                  color: "#cbd5e1",
                  marginBottom: "4px",
                }}
                formatter={(value) => [
                  `${Number(value).toFixed(2).replace(".", ",")} kr/kWh`,
                  "Elpris",
                ]}
              />

              {currentTime && (
                <ReferenceLine
                  x={currentTime}
                  stroke="#f8fafc"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: "NU",
                    position: "top",
                    fill: "#f8fafc",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
              )}

              <Line
                type="monotone"
                dataKey="price"
                stroke="#60a5fa"
                strokeWidth={3}
                dot={false}
                activeDot={{
                  r: 6,
                  fill: "#60a5fa",
                  stroke: "#ffffff",
                  strokeWidth: 2,
                }}
                animationDuration={1000}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rekommendation */}
      {cheapestThreeHours && (
        <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-400/15 p-2 text-emerald-200">
              <TrendingDown size={21} />
            </div>

            <div>
              <p className="text-sm font-medium text-emerald-200">
                Rekommenderad tid
              </p>

              <p className="mt-1 text-lg font-semibold text-white">
                Billigast sammanhängande tre timmar
              </p>

              <p className="mt-2 text-2xl font-bold text-white">
                {formatHour(cheapestThreeHours.startTime)}–
                {formatHour(cheapestThreeHours.endTime)}
              </p>

              <p className="mt-1 text-sm text-slate-300">
                Genomsnittligt pris:{" "}
                <span className="font-semibold text-white">
                  {formatPrice(cheapestThreeHours.averagePrice)} kr/kWh
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}