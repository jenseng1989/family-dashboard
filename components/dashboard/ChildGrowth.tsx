"use client";

import {
  Baby,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Gauge,
  LoaderCircle,
  Plus,
  RefreshCw,
  Ruler,
  Scale,
  Trash2,
  TrendingUp,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import ChildDocumentationButton from "@/components/dashboard/ChildDocumentationButton";
import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";

type GrowthMeasurement = {
  id: string;
  member_id: string;
  measurement_date: string;
  weight_kg: number;
  height_cm: number;
  created_at: string;
};

type ChartRow = {
  date: string;
  fullDate: string;
  weight: number;
  height: number;
};

export type ChildGrowthSection =
  | "growth"
  | "weight"
  | "height"
  | "history";

type ChildGrowthProps = {
  memberId: string;
  displayName: string;
  section?: ChildGrowthSection;
};

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function formatShortDate(dateString: string): string {
  return parseLocalDate(dateString).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
  });
}

function formatFullDate(dateString: string): string {
  return parseLocalDate(dateString).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function toNumber(value: number | string): number {
  return typeof value === "number" ? value : Number(value);
}

function daysBetween(firstDate: string, secondDate: string): number {
  const first = parseLocalDate(firstDate);
  const second = parseLocalDate(secondDate);

  const firstUtc = Date.UTC(
    first.getFullYear(),
    first.getMonth(),
    first.getDate()
  );

  const secondUtc = Date.UTC(
    second.getFullYear(),
    second.getMonth(),
    second.getDate()
  );

  return Math.max(
    0,
    Math.round((secondUtc - firstUtc) / 86_400_000)
  );
}

function formatSignedNumber(
  value: number,
  decimals: number,
  unit: string
): string {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(decimals)} ${unit}`;
}

function EmptyGrowthState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-7 text-center">
      <div className="text-blue-300">
        {icon}
      </div>

      <p className="mt-4 font-semibold text-white">
        {title}
      </p>

      <p className="mt-1 max-w-md text-sm leading-6 text-slate-400">
        {description}
      </p>
    </div>
  );
}

export default function ChildGrowth({
  memberId,
  displayName,
  section = "growth",
}: ChildGrowthProps) {
  const [measurements, setMeasurements] = useState<
    GrowthMeasurement[]
  >([]);

  const [measurementDate, setMeasurementDate] = useState(
    getTodayDateString()
  );

  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(
    null
  );

  const [errorMessage, setErrorMessage] = useState<
    string | null
  >(null);

  const [historyOpen, setHistoryOpen] = useState(false);

  const loadMeasurements = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("signe_growth")
      .select(
        "id, member_id, measurement_date, weight_kg, height_cm, created_at"
      )
      .eq("member_id", memberId)
      .order("measurement_date", {
        ascending: true,
      });

    if (error) {
      console.error(
        `Kunde inte hämta tillväxtdata för ${displayName}:`,
        error
      );

      setErrorMessage(
        "Kunde inte hämta mätningarna från databasen."
      );

      setIsLoading(false);
      return;
    }

    const normalizedData: GrowthMeasurement[] = (data ?? []).map(
      (measurement) => ({
        ...measurement,
        weight_kg: toNumber(measurement.weight_kg),
        height_cm: toNumber(measurement.height_cm),
      })
    );

    setMeasurements(normalizedData);
    setIsLoading(false);
  }, [memberId, displayName]);

  useEffect(() => {
    void loadMeasurements();
  }, [loadMeasurements]);

  const chartData = useMemo<ChartRow[]>(
    () =>
      measurements.map((measurement) => ({
        date: formatShortDate(measurement.measurement_date),
        fullDate: formatFullDate(measurement.measurement_date),
        weight: measurement.weight_kg,
        height: measurement.height_cm,
      })),
    [measurements]
  );

  const latestMeasurement =
    measurements.length > 0
      ? measurements[measurements.length - 1]
      : null;

  const previousMeasurement =
    measurements.length > 1
      ? measurements[measurements.length - 2]
      : null;

  const firstMeasurement =
    measurements.length > 0 ? measurements[0] : null;

  const weightChange =
    latestMeasurement && previousMeasurement
      ? latestMeasurement.weight_kg -
        previousMeasurement.weight_kg
      : null;

  const heightChange =
    latestMeasurement && previousMeasurement
      ? latestMeasurement.height_cm -
        previousMeasurement.height_cm
      : null;

  const daysSincePrevious =
    latestMeasurement && previousMeasurement
      ? daysBetween(
          previousMeasurement.measurement_date,
          latestMeasurement.measurement_date
        )
      : null;

  const weightChangeGrams =
    weightChange !== null ? weightChange * 1000 : null;

  const averageWeightChangePerDay =
    weightChangeGrams !== null &&
    daysSincePrevious !== null &&
    daysSincePrevious > 0
      ? weightChangeGrams / daysSincePrevious
      : null;

  const totalWeightChange =
    latestMeasurement && firstMeasurement
      ? latestMeasurement.weight_kg - firstMeasurement.weight_kg
      : null;

  const totalHeightChange =
    latestMeasurement && firstMeasurement
      ? latestMeasurement.height_cm - firstMeasurement.height_cm
      : null;

  const totalMeasurementDays =
    latestMeasurement && firstMeasurement
      ? daysBetween(
          firstMeasurement.measurement_date,
          latestMeasurement.measurement_date
        )
      : null;

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const weightValue = Number(weight.replace(",", "."));
    const heightValue = Number(height.replace(",", "."));

    if (
      !measurementDate ||
      !Number.isFinite(weightValue) ||
      !Number.isFinite(heightValue) ||
      weightValue < 1 ||
      weightValue > 150 ||
      heightValue < 30 ||
      heightValue > 220 ||
      isSaving
    ) {
      setErrorMessage(
        "Kontrollera datum, vikt och längd innan du sparar."
      );

      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("signe_growth")
      .insert({
        member_id: memberId,
        measurement_date: measurementDate,
        weight_kg: weightValue,
        height_cm: heightValue,
      })
      .select(
        "id, member_id, measurement_date, weight_kg, height_cm, created_at"
      )
      .single();

    if (error) {
      console.error(
        `Kunde inte spara mätningen för ${displayName}:`,
        error
      );

      if (error.code === "23505") {
        setErrorMessage(
          "Det finns redan en mätning för det valda datumet."
        );
      } else {
        setErrorMessage("Mätningen kunde inte sparas.");
      }

      setIsSaving(false);
      return;
    }

    const newMeasurement: GrowthMeasurement = {
      ...data,
      weight_kg: toNumber(data.weight_kg),
      height_cm: toNumber(data.height_cm),
    };

    setMeasurements((currentMeasurements) =>
      [...currentMeasurements, newMeasurement].sort(
        (first, second) =>
          parseLocalDate(first.measurement_date).getTime() -
          parseLocalDate(second.measurement_date).getTime()
      )
    );

    setWeight("");
    setHeight("");
    setMeasurementDate(getTodayDateString());
    setIsSaving(false);
  }

  async function removeMeasurement(id: string) {
    if (deletingId !== null) {
      return;
    }

    setDeletingId(id);
    setErrorMessage(null);

    const { error } = await supabase
      .from("signe_growth")
      .delete()
      .eq("id", id)
      .eq("member_id", memberId);

    if (error) {
      console.error(
        `Kunde inte ta bort mätningen för ${displayName}:`,
        error
      );

      setErrorMessage("Mätningen kunde inte tas bort.");
      setDeletingId(null);
      return;
    }

    setMeasurements((currentMeasurements) =>
      currentMeasurements.filter(
        (measurement) => measurement.id !== id
      )
    );

    setDeletingId(null);
  }

  return (
    <div className="grid gap-5">
      {section === "growth" && (
        <Card
          title="Tillväxt"
          icon={<Baby size={28} />}
          storageKey={`child-${memberId}-growth`}
        >
          {isLoading ? (
            <div className="flex min-h-52 flex-col items-center justify-center gap-3">
              <LoaderCircle
                size={32}
                className="animate-spin text-blue-300"
              />

              <p className="text-sm text-slate-400">
                Hämtar mätningarna…
              </p>
            </div>
          ) : (
            <>
              {latestMeasurement ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-blue-300/15 bg-blue-400/[0.06] p-4">
                      <div className="flex items-center gap-2 text-blue-300">
                        <Scale size={17} />

                        <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                          Vikt
                        </p>
                      </div>

                      <p className="mt-3 text-3xl font-black text-white">
                        {latestMeasurement.weight_kg.toFixed(2)}
                        <span className="ml-1 text-base font-semibold text-slate-400">
                          kg
                        </span>
                      </p>

                      {weightChange !== null && (
                        <p className="mt-2 text-sm font-semibold text-blue-200">
                          {formatSignedNumber(
                            weightChange,
                            2,
                            "kg"
                          )}{" "}
                          sedan sist
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.06] p-4">
                      <div className="flex items-center gap-2 text-emerald-300">
                        <Ruler size={17} />

                        <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                          Längd
                        </p>
                      </div>

                      <p className="mt-3 text-3xl font-black text-white">
                        {latestMeasurement.height_cm.toFixed(1)}
                        <span className="ml-1 text-base font-semibold text-slate-400">
                          cm
                        </span>
                      </p>

                      {heightChange !== null && (
                        <p className="mt-2 text-sm font-semibold text-emerald-200">
                          {formatSignedNumber(
                            heightChange,
                            1,
                            "cm"
                          )}{" "}
                          sedan sist
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-violet-300/15 bg-violet-400/[0.06] p-4">
                      <div className="flex items-center gap-2 text-violet-300">
                        <Gauge size={17} />

                        <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                          Sedan förra
                        </p>
                      </div>

                      <p className="mt-3 text-2xl font-black text-white">
                        {daysSincePrevious !== null
                          ? `${daysSincePrevious} dagar`
                          : "Första mätningen"}
                      </p>

                      {averageWeightChangePerDay !== null && (
                        <p className="mt-2 text-sm text-slate-400">
                          {averageWeightChangePerDay >= 0 ? "+" : ""}
                          {averageWeightChangePerDay.toFixed(1)}{" "}
                          g/dag mellan de två senaste mätningarna
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-amber-300/15 bg-amber-400/[0.06] p-4">
                      <div className="flex items-center gap-2 text-amber-300">
                        <CalendarDays size={17} />

                        <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                          Senast mätt
                        </p>
                      </div>

                      <p className="mt-3 text-lg font-bold capitalize text-white">
                        {formatFullDate(
                          latestMeasurement.measurement_date
                        )}
                      </p>

                      <p className="mt-2 text-sm text-slate-400">
                        {measurements.length}{" "}
                        {measurements.length === 1
                          ? "sparad mätning"
                          : "sparade mätningar"}
                      </p>
                    </div>
                  </div>

                  {measurements.length > 1 && (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp
                          size={18}
                          className="text-amber-300"
                        />

                        <p className="font-semibold text-white">
                          Sedan första mätningen
                        </p>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                            Vikt
                          </p>

                          <p className="mt-1 font-bold text-white">
                            {totalWeightChange !== null
                              ? formatSignedNumber(
                                  totalWeightChange,
                                  2,
                                  "kg"
                                )
                              : "–"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                            Längd
                          </p>

                          <p className="mt-1 font-bold text-white">
                            {totalHeightChange !== null
                              ? formatSignedNumber(
                                  totalHeightChange,
                                  1,
                                  "cm"
                                )
                              : "–"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                            Period
                          </p>

                          <p className="mt-1 font-bold text-white">
                            {totalMeasurementDays !== null
                              ? `${totalMeasurementDays} dagar`
                              : "–"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-7 text-center">
                  <TrendingUp
                    size={38}
                    className="mx-auto text-blue-300"
                  />

                  <p className="mt-4 font-semibold text-white">
                    Inga mätningar ännu
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Lägg till {displayName}s första vikt och längd
                    nedan.
                  </p>
                </div>
              )}

              {errorMessage && (
                <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-red-200">
                    {errorMessage}
                  </p>

                  <button
                    type="button"
                    onClick={() => void loadMeasurements()}
                    className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-300/20 bg-red-300/10 px-3 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-300/20"
                  >
                    <RefreshCw size={16} />
                    Hämta igen
                  </button>
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="mb-4">
                  <p className="font-semibold text-white">
                    Lägg till mätning
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Spara vikt och längd från BVC eller en egen
                    mätning.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-4 md:items-end">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-300">
                      Datum
                    </span>

                    <input
                      type="date"
                      value={measurementDate}
                      max={getTodayDateString()}
                      onChange={(event) =>
                        setMeasurementDate(event.target.value)
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-300">
                      Vikt i kg
                    </span>

                    <div className="relative">
                      <Scale
                        size={18}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                      />

                      <input
                        type="number"
                        inputMode="decimal"
                        min="1"
                        max="150"
                        step="0.01"
                        value={weight}
                        onChange={(event) =>
                          setWeight(event.target.value)
                        }
                        placeholder="Till exempel 6,25"
                        className="w-full rounded-xl border border-white/10 bg-slate-950/40 py-3 pl-11 pr-4 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-300">
                      Längd i cm
                    </span>

                    <div className="relative">
                      <Ruler
                        size={18}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                      />

                      <input
                        type="number"
                        inputMode="decimal"
                        min="30"
                        max="220"
                        step="0.1"
                        value={height}
                        onChange={(event) =>
                          setHeight(event.target.value)
                        }
                        placeholder="Till exempel 64,5"
                        className="w-full rounded-xl border border-white/10 bg-slate-950/40 py-3 pl-11 pr-4 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                      />
                    </div>
                  </label>

                  <button
                    type="submit"
                    disabled={
                      !measurementDate ||
                      !weight ||
                      !height ||
                      isSaving
                    }
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSaving ? (
                      <LoaderCircle
                        size={19}
                        className="animate-spin"
                      />
                    ) : (
                      <Plus size={19} />
                    )}

                    {isSaving ? "Sparar…" : "Spara mätning"}
                  </button>
                </div>
              </form>
            </>
          )}
        </Card>
      )}

      {section === "weight" && (
        <Card
          title="Viktutveckling"
          icon={<Scale size={28} />}
          storageKey={`child-${memberId}-growth-weight-chart`}
        >
          {isLoading ? (
            <div className="flex min-h-56 items-center justify-center">
              <LoaderCircle
                size={30}
                className="animate-spin text-blue-300"
              />
            </div>
          ) : measurements.length === 0 ? (
            <EmptyGrowthState
              icon={<Scale size={38} />}
              title="Ingen viktdata ännu"
              description={`Lägg till ${displayName}s första mätning i Tillväxt. Därefter visas viktutvecklingen här.`}
            />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 15,
                    left: -10,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.08)"
                  />

                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />

                  <YAxis
                    stroke="#94a3b8"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    unit=" kg"
                    domain={["dataMin - 0.3", "dataMax + 0.3"]}
                  />

                  <Tooltip
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.fullDate ?? ""
                    }
                    formatter={(value) => [
                      `${Number(value).toFixed(2)} kg`,
                      "Vikt",
                    ]}
                    contentStyle={{
                      background: "#0f172a",
                      border:
                        "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "12px",
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#60a5fa"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: "#60a5fa",
                    }}
                    activeDot={{
                      r: 6,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      )}

      {section === "height" && (
        <Card
          title="Längdutveckling"
          icon={<Ruler size={28} />}
          storageKey={`child-${memberId}-growth-height-chart`}
        >
          {isLoading ? (
            <div className="flex min-h-56 items-center justify-center">
              <LoaderCircle
                size={30}
                className="animate-spin text-emerald-300"
              />
            </div>
          ) : measurements.length === 0 ? (
            <EmptyGrowthState
              icon={<Ruler size={38} />}
              title="Ingen längddata ännu"
              description={`Lägg till ${displayName}s första mätning i Tillväxt. Därefter visas längdutvecklingen här.`}
            />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 15,
                    left: -10,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.08)"
                  />

                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />

                  <YAxis
                    stroke="#94a3b8"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    unit=" cm"
                    domain={["dataMin - 1", "dataMax + 1"]}
                  />

                  <Tooltip
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.fullDate ?? ""
                    }
                    formatter={(value) => [
                      `${Number(value).toFixed(1)} cm`,
                      "Längd",
                    ]}
                    contentStyle={{
                      background: "#0f172a",
                      border:
                        "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "12px",
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="height"
                    stroke="#34d399"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: "#34d399",
                    }}
                    activeDot={{
                      r: 6,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      )}

      {section === "history" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.025]">
          {isLoading ? (
            <div className="flex min-h-32 items-center justify-center">
              <LoaderCircle
                size={28}
                className="animate-spin text-blue-300"
              />
            </div>
          ) : measurements.length === 0 ? (
            <>
              <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <CalendarDays
                    size={20}
                    className="text-blue-300"
                  />

                  <div>
                    <p className="font-semibold text-white">
                      Mäthistorik
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      0 sparade mätningar
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <ChildDocumentationButton
                    memberId={memberId}
                    displayName={displayName}
                  />
                </div>
              </div>

              <div className="border-t border-white/10 p-4">
                <EmptyGrowthState
                  icon={<CalendarDays size={38} />}
                  title="Ingen mäthistorik ännu"
                  description={`När du lägger till ${displayName}s första mätning visas den här.`}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setHistoryOpen((current) => !current)
                  }
                  className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <CalendarDays
                      size={20}
                      className="shrink-0 text-blue-300"
                    />

                    <div className="min-w-0">
                      <p className="font-semibold text-white">
                        Mäthistorik
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {measurements.length} sparade mätningar
                      </p>
                    </div>
                  </div>

                  {historyOpen ? (
                    <ChevronUp
                      size={19}
                      className="shrink-0 text-slate-400"
                    />
                  ) : (
                    <ChevronDown
                      size={19}
                      className="shrink-0 text-slate-400"
                    />
                  )}
                </button>

                <div className="shrink-0">
                  <ChildDocumentationButton
                    memberId={memberId}
                    displayName={displayName}
                  />
                </div>
              </div>

              {historyOpen && (
                <div className="border-t border-white/10 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[...measurements]
                      .reverse()
                      .map((measurement) => {
                        const isDeleting =
                          deletingId === measurement.id;

                        return (
                          <article
                            key={measurement.id}
                            className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                          >
                            <div>
                              <p className="font-semibold capitalize text-white">
                                {formatFullDate(
                                  measurement.measurement_date
                                )}
                              </p>

                              <p className="mt-1 text-sm text-slate-400">
                                {measurement.weight_kg.toFixed(2)} kg
                                {" · "}
                                {measurement.height_cm.toFixed(1)} cm
                              </p>
                            </div>

                            <button
                              type="button"
                              disabled={deletingId !== null}
                              onClick={() =>
                                void removeMeasurement(
                                  measurement.id
                                )
                              }
                              aria-label={`Ta bort mätningen från ${formatFullDate(
                                measurement.measurement_date
                              )}`}
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-300 disabled:cursor-wait disabled:opacity-50"
                            >
                              {isDeleting ? (
                                <LoaderCircle
                                  size={18}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2 size={18} />
                              )}
                            </button>
                          </article>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}