"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
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
  Sparkles,
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

type RankedHour = {
  price: ElectricityPrice;
  rank: number;
};

function findCheapestPeriod(
  prices: ElectricityPrice[],
  hours: number
): CheapestPeriod | null {
  if (prices.length < hours || hours < 1) {
    return null;
  }

  let cheapestPeriod: CheapestPeriod | null = null;

  for (let index = 0; index <= prices.length - hours; index += 1) {
    const period = prices.slice(index, index + hours);

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

function getPriceLabel(
  current: number,
  min: number,
  max: number
): string {
  const range = max - min;

  if (range <= 0) {
    return "Normalt";
  }

  const position = (current - min) / range;

  if (position <= 0.25) return "Billigt";
  if (position <= 0.55) return "Normalt";
  if (position <= 0.8) return "Dyrt";

  return "Mycket dyrt";
}

function getPriceLabelClasses(label: string): string {
  switch (label) {
    case "Billigt":
      return "border-emerald-300/20 bg-emerald-400/[0.10] text-emerald-200";
    case "Normalt":
      return "border-blue-300/20 bg-blue-400/[0.10] text-blue-200";
    case "Dyrt":
      return "border-orange-300/20 bg-orange-400/[0.10] text-orange-200";
    case "Mycket dyrt":
      return "border-red-300/20 bg-red-400/[0.10] text-red-200";
    default:
      return "border-white/10 bg-white/[0.06] text-slate-200";
  }
}

function getSmartAdvice(
  prices: ElectricityPrice[],
  currentPrice: ElectricityPrice | null,
  averagePrice: number
): string {
  if (!currentPrice) {
    return "Se dagens graf för att hitta de billigaste timmarna.";
  }

  const currentIndex = prices.findIndex(
    (price) => price.time_start === currentPrice.time_start
  );

  if (currentIndex < 0) {
    return "Se dagens graf för att hitta de billigaste timmarna.";
  }

  const current = currentPrice.SEK_per_kWh;
  const future = prices.slice(currentIndex + 1);

  const cheaper = [...future]
    .filter((price) => price.SEK_per_kWh < current)
    .sort((a, b) => a.SEK_per_kWh - b.SEK_per_kWh)[0];

  if (cheaper && current > 0) {
    const drop = Math.round(
      ((current - cheaper.SEK_per_kWh) / current) * 100
    );

    if (drop >= 20) {
      return `Kan du vänta? Priset blir cirka ${drop} % lägre från ${formatHour(
        cheaper.time_start
      )}.`;
    }
  }

  if (current <= averagePrice * 0.75) {
    return "Bra elpris just nu – tydligt under dagens snitt.";
  }

  if (current >= averagePrice * 1.25) {
    return "Priset är högt jämfört med dagens snitt. Undvik gärna större elförbrukning just nu.";
  }

  return "Priset ligger nära dagens snitt just nu.";
}

function getFuturePrices(
  prices: ElectricityPrice[],
  currentPrice: ElectricityPrice | null
): ElectricityPrice[] {
  if (!currentPrice) {
    return [];
  }

  const currentIndex = prices.findIndex(
    (price) => price.time_start === currentPrice.time_start
  );

  if (currentIndex < 0) {
    return [];
  }

  return prices.slice(currentIndex);
}

function getTopHours(
  prices: ElectricityPrice[],
  count = 3
): RankedHour[] {
  return [...prices]
    .sort((a, b) => a.SEK_per_kWh - b.SEK_per_kWh)
    .slice(0, count)
    .map((price, index) => ({
      price,
      rank: index + 1,
    }));
}

function getRankSymbol(rank: number): string {
  switch (rank) {
    case 1:
      return "🥇";
    case 2:
      return "🥈";
    case 3:
      return "🥉";
    default:
      return `${rank}.`;
  }
}

export default function ElectricityWidget() {
  const [electricity, setElectricity] =
    useState<ElectricityData | null>(null);
  const [error, setError] =
    useState<string | null>(null);
  const [isLoading, setIsLoading] =
    useState(true);
  const [selectedHours, setSelectedHours] =
    useState(3);

  async function loadElectricity() {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/electricity", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Kunde inte hämta elpriser"
        );
      }

      if (!Array.isArray(data.prices)) {
        throw new Error(
          "Elpris-API:t returnerade ett oväntat svar"
        );
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
    void loadElectricity();
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

  const cheapestPeriod = useMemo(() => {
    if (!electricity) {
      return null;
    }

    return findCheapestPeriod(
      electricity.prices,
      selectedHours
    );
  }, [electricity, selectedHours]);

  const futurePrices = useMemo(() => {
    if (!electricity) {
      return [];
    }

    return getFuturePrices(
      electricity.prices,
      electricity.currentPrice
    );
  }, [electricity]);

  const bestToday = useMemo(() => {
    if (!electricity) {
      return [];
    }

    return getTopHours(electricity.prices);
  }, [electricity]);

  const bestAhead = useMemo(
    () => getTopHours(futurePrices),
    [futurePrices]
  );

  const cheapestFuturePeriod = useMemo(() => {
    return findCheapestPeriod(
      futurePrices,
      selectedHours
    );
  }, [futurePrices, selectedHours]);

  if (isLoading) {
    return (
      <Card
        title="Elpris"
        icon={<Zap size={28} />}
        className="md:col-span-2 xl:col-span-2"
      >
        <div className="flex min-h-40 items-center justify-center gap-3 text-slate-300">
          <RefreshCw
            className="animate-spin"
            size={22}
          />
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
            <AlertTriangle
              className="mt-0.5 text-red-300"
              size={22}
            />

            <div>
              <p className="font-semibold text-white">
                Elpriserna kunde inte hämtas
              </p>

              <p className="mt-1 text-sm text-slate-300">
                {error ?? "Okänt fel"}
              </p>

              <button
                type="button"
                onClick={() => void loadElectricity()}
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

  const currentPriceLabel = electricity.currentPrice
    ? getPriceLabel(
        electricity.currentPrice.SEK_per_kWh,
        electricity.minPrice.SEK_per_kWh,
        electricity.maxPrice.SEK_per_kWh
      )
    : null;

  const smartAdvice = getSmartAdvice(
    electricity.prices,
    electricity.currentPrice,
    electricity.averagePrice
  );

  const highlightedPeriod =
    cheapestFuturePeriod ?? cheapestPeriod;

  const periodIsFuture =
    cheapestFuturePeriod !== null;

  return (
    <Card
      title="Elpris"
      icon={<Zap size={28} />}
      className="md:col-span-2 xl:col-span-2"
    >
      <div className="overflow-hidden rounded-3xl border border-blue-400/20 bg-gradient-to-br from-blue-500/[0.14] via-cyan-500/[0.06] to-slate-950/20 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
              Elpris just nu · {electricity.area}
            </p>

            <div className="mt-2 flex flex-wrap items-end gap-3">
              <p className="text-4xl font-black text-white sm:text-5xl">
                {electricity.currentPrice
                  ? formatPrice(
                      electricity.currentPrice.SEK_per_kWh
                    )
                  : "–"}
              </p>

              <p className="pb-1 text-sm font-semibold text-slate-400">
                kr/kWh
              </p>
            </div>

            {currentPriceLabel && (
              <span
                className={[
                  "mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-bold",
                  getPriceLabelClasses(
                    currentPriceLabel
                  ),
                ].join(" ")}
              >
                {currentPriceLabel} just nu
              </span>
            )}

            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
              {smartAdvice}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[310px]">
            <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.07] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
                Billigast
              </p>
              <p className="mt-2 text-lg font-bold text-white">
                {formatPrice(
                  electricity.minPrice.SEK_per_kWh
                )}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                {formatHour(
                  electricity.minPrice.time_start
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Snitt
              </p>
              <p className="mt-2 text-lg font-bold text-white">
                {formatPrice(
                  electricity.averagePrice
                )}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                kr/kWh
              </p>
            </div>

            <div className="rounded-2xl border border-red-300/15 bg-red-400/[0.07] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-red-300">
                Dyrast
              </p>
              <p className="mt-2 text-lg font-bold text-white">
                {formatPrice(
                  electricity.maxPrice.SEK_per_kWh
                )}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                {formatHour(
                  electricity.maxPrice.time_start
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.05] p-4">
          <div className="flex items-center gap-2">
            <Sparkles
              size={17}
              className="text-emerald-300"
            />
            <p className="font-semibold text-white">
              Bäst idag
            </p>
          </div>

          <p className="mt-1 text-xs text-slate-500">
            Dagens tre billigaste enskilda timmar
          </p>

          <div className="mt-4 space-y-2">
            {bestToday.map(({ price, rank }) => (
              <div
                key={price.time_start}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/20 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {getRankSymbol(rank)}
                  </span>
                  <span className="font-semibold text-white">
                    {formatHour(
                      price.time_start
                    )}
                    –
                    {formatHour(
                      price.time_end
                    )}
                  </span>
                </div>

                <span className="text-sm font-semibold text-emerald-200">
                  {formatPrice(
                    price.SEK_per_kWh
                  )}{" "}
                  kr
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-blue-300/15 bg-blue-400/[0.05] p-4">
          <div className="flex items-center gap-2">
            <Clock3
              size={17}
              className="text-blue-300"
            />
            <p className="font-semibold text-white">
              Bäst framöver
            </p>
          </div>

          <p className="mt-1 text-xs text-slate-500">
            Billigaste timmarna som fortfarande återstår idag
          </p>

          <div className="mt-4 space-y-2">
            {bestAhead.length > 0 ? (
              bestAhead.map(({ price, rank }) => (
                <div
                  key={price.time_start}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/20 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {getRankSymbol(rank)}
                    </span>
                    <span className="font-semibold text-white">
                      {formatHour(
                        price.time_start
                      )}
                      –
                      {formatHour(
                        price.time_end
                      )}
                    </span>
                  </div>

                  <span className="text-sm font-semibold text-blue-200">
                    {formatPrice(
                      price.SEK_per_kWh
                    )}{" "}
                    kr
                  </span>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-white/10 bg-slate-950/20 px-3 py-4 text-sm text-slate-400">
                Inga fler timpriser återstår idag.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-semibold text-white">
              Pris under dagen
            </h3>
            <p className="text-sm text-slate-400">
              Timpris i kronor per kWh
            </p>
          </div>

          <span className="w-fit rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-200">
            {electricity.area}
          </span>
        </div>

        <div className="h-72 rounded-2xl border border-white/10 bg-slate-950/20 p-3">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
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
                  value
                    .toFixed(1)
                    .replace(".", ",")
                }
              />

              <Tooltip
                cursor={{
                  stroke:
                    "rgba(255,255,255,0.2)",
                  strokeDasharray: "4 4",
                }}
                contentStyle={{
                  background: "#020617",
                  border:
                    "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "16px",
                  color: "white",
                  boxShadow:
                    "0 18px 50px rgba(0,0,0,0.35)",
                }}
                labelStyle={{
                  color: "#cbd5e1",
                  marginBottom: "4px",
                }}
                formatter={(value) => [
                  `${Number(value)
                    .toFixed(2)
                    .replace(
                      ".",
                      ","
                    )} kr/kWh`,
                  "Elpris",
                ]}
              />

              {highlightedPeriod && (
                <ReferenceArea
                  x1={formatHour(
                    highlightedPeriod.startTime
                  )}
                  x2={formatHour(
                    highlightedPeriod.endTime
                  )}
                  fill="#34d399"
                  fillOpacity={0.08}
                  strokeOpacity={0}
                />
              )}

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

        {highlightedPeriod && (
          <p className="mt-2 text-xs text-slate-500">
            Det gröna området markerar den billigaste valda
            perioden {periodIsFuture ? "som återstår idag" : "idag"}.
          </p>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-400/15 p-2 text-emerald-200">
              <TrendingDown size={21} />
            </div>

            <div>
              <p className="text-sm font-medium text-emerald-200">
                {periodIsFuture
                  ? "Billigaste perioden framöver"
                  : "Billigaste perioden idag"}
              </p>

              {highlightedPeriod && (
                <>
                  <p className="mt-1 text-2xl font-bold text-white">
                    {formatHour(
                      highlightedPeriod.startTime
                    )}
                    –
                    {formatHour(
                      highlightedPeriod.endTime
                    )}
                  </p>

                  <p className="mt-1 text-sm text-slate-300">
                    Genomsnittligt pris:{" "}
                    <span className="font-semibold text-white">
                      {formatPrice(
                        highlightedPeriod.averagePrice
                      )}{" "}
                      kr/kWh
                    </span>
                  </p>
                </>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              Välj längd
            </p>

            <div className="flex gap-2">
              {[1, 2, 3, 4].map(
                (hours) => (
                  <button
                    key={hours}
                    type="button"
                    onClick={() =>
                      setSelectedHours(
                        hours
                      )
                    }
                    className={[
                      "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                      selectedHours ===
                      hours
                        ? "border-emerald-300/30 bg-emerald-300/15 text-emerald-100"
                        : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10",
                    ].join(" ")}
                  >
                    {hours} h
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.05] p-4">
          <div className="flex items-center gap-2 text-emerald-200">
            <TrendingDown size={16} />
            <p className="text-xs font-semibold uppercase tracking-[0.12em]">
              Dagens lägsta
            </p>
          </div>
          <p className="mt-2 font-bold text-white">
            {formatPrice(
              electricity.minPrice.SEK_per_kWh
            )}{" "}
            kr/kWh
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-slate-300">
            <Clock3 size={16} />
            <p className="text-xs font-semibold uppercase tracking-[0.12em]">
              Dagens snitt
            </p>
          </div>
          <p className="mt-2 font-bold text-white">
            {formatPrice(
              electricity.averagePrice
            )}{" "}
            kr/kWh
          </p>
        </div>

        <div className="rounded-2xl border border-red-400/15 bg-red-500/[0.05] p-4">
          <div className="flex items-center gap-2 text-red-200">
            <TrendingUp size={16} />
            <p className="text-xs font-semibold uppercase tracking-[0.12em]">
              Dagens högsta
            </p>
          </div>
          <p className="mt-2 font-bold text-white">
            {formatPrice(
              electricity.maxPrice.SEK_per_kWh
            )}{" "}
            kr/kWh
          </p>
        </div>
      </div>
    </Card>
  );
}
