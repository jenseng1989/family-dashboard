"use client";

import {
  Baby,
  CalendarDays,
  ChevronDown,
  ChevronUp,
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
  ReactNode,
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
import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";

type GrowthMeasurement = {
  id: string;
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

type CollapseButtonProps = {
  isCollapsed: boolean;
  onClick: () => void;
};

function CollapseButton({
  isCollapsed,
  onClick,
}: CollapseButtonProps) {
  return (
    <div className="mb-4 flex justify-end">
      <button
        type="button"
        onClick={onClick}
        aria-expanded={!isCollapsed}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
      >
        {isCollapsed ? (
          <>
            <ChevronDown size={17} />
            Visa
          </>
        ) : (
          <>
            <ChevronUp size={17} />
            Minimera
          </>
        )}
      </button>
    </div>
  );
}

type CollapsibleCardProps = {
  title: string;
  icon: ReactNode;
  isCollapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
};

function CollapsibleCard({
  title,
  icon,
  isCollapsed,
  onToggle,
  children,
}: CollapsibleCardProps) {
  return (
    <Card title={title} icon={icon}>
      <CollapseButton
        isCollapsed={isCollapsed}
        onClick={onToggle}
      />

      {!isCollapsed && (
        <div className="animate-[fadeIn_250ms_ease-out]">
          {children}
        </div>
      )}
    </Card>
  );
}

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

export default function SigneGrowth() {
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
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null
  );

  const [isGrowthFormCollapsed, setIsGrowthFormCollapsed] =
    useState(false);
  const [isWeightChartCollapsed, setIsWeightChartCollapsed] =
    useState(false);
  const [isHeightChartCollapsed, setIsHeightChartCollapsed] =
    useState(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] =
    useState(true);

  const loadMeasurements = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("signe_growth")
      .select(
        "id, measurement_date, weight_kg, height_cm, created_at"
      )
      .order("measurement_date", { ascending: true });

    if (error) {
      console.error(
        "Kunde inte hämta Signes tillväxtdata:",
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
  }, []);

  useEffect(() => {
    void loadMeasurements();
  }, [loadMeasurements]);

  const chartData = useMemo<ChartRow[]>(() => {
    return measurements.map((measurement) => ({
      date: formatShortDate(measurement.measurement_date),
      fullDate: formatFullDate(measurement.measurement_date),
      weight: measurement.weight_kg,
      height: measurement.height_cm,
    }));
  }, [measurements]);

  const latestMeasurement =
    measurements.length > 0
      ? measurements[measurements.length - 1]
      : null;

  const previousMeasurement =
    measurements.length > 1
      ? measurements[measurements.length - 2]
      : null;

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
        measurement_date: measurementDate,
        weight_kg: weightValue,
        height_cm: heightValue,
      })
      .select(
        "id, measurement_date, weight_kg, height_cm, created_at"
      )
      .single();

    if (error) {
      console.error("Kunde inte spara mätningen:", error);

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
        (firstMeasurement, secondMeasurement) =>
          parseLocalDate(
            firstMeasurement.measurement_date
          ).getTime() -
          parseLocalDate(
            secondMeasurement.measurement_date
          ).getTime()
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
      .eq("id", id);

    if (error) {
      console.error("Kunde inte ta bort mätningen:", error);
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
      <CollapsibleCard
        title="Signes tillväxt"
        icon={<Baby size={28} />}
        isCollapsed={isGrowthFormCollapsed}
        onToggle={() =>
          setIsGrowthFormCollapsed((current) => !current)
        }
      >
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-white/5 p-4"
        >
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
                  placeholder="Till exempel 5,25"
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
                  placeholder="Till exempel 57,5"
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

        {latestMeasurement && (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">
                Senaste vikt
              </p>

              <p className="mt-2 text-2xl font-bold text-white">
                {latestMeasurement.weight_kg.toFixed(2)} kg
              </p>

              {weightChange !== null && (
                <p className="mt-1 text-sm text-blue-300">
                  {weightChange >= 0 ? "+" : ""}
                  {weightChange.toFixed(2)} kg sedan sist
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">
                Senaste längd
              </p>

              <p className="mt-2 text-2xl font-bold text-white">
                {latestMeasurement.height_cm.toFixed(1)} cm
              </p>

              {heightChange !== null && (
                <p className="mt-1 text-sm text-blue-300">
                  {heightChange >= 0 ? "+" : ""}
                  {heightChange.toFixed(1)} cm sedan sist
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">
                Senaste mätning
              </p>

              <p className="mt-2 text-lg font-semibold capitalize text-white">
                {formatFullDate(
                  latestMeasurement.measurement_date
                )}
              </p>

              <p className="mt-1 text-sm text-slate-400">
                {measurements.length} sparade mätningar
              </p>
            </div>
          </div>
        )}
      </CollapsibleCard>

      {isLoading ? (
        <Card
          title="Tillväxtgrafer"
          icon={<TrendingUp size={28} />}
        >
          <div className="flex min-h-64 flex-col items-center justify-center gap-3">
            <LoaderCircle
              size={32}
              className="animate-spin text-blue-300"
            />

            <p className="text-sm text-slate-400">
              Hämtar mätningarna…
            </p>
          </div>
        </Card>
      ) : measurements.length === 0 ? (
        <Card
          title="Tillväxtgrafer"
          icon={<TrendingUp size={28} />}
        >
          <div className="flex min-h-64 flex-col items-center justify-center text-center">
            <TrendingUp
              size={38}
              className="text-blue-300"
            />

            <p className="mt-4 font-semibold text-white">
              Inga mätningar ännu
            </p>

            <p className="mt-1 max-w-md text-sm text-slate-400">
              Lägg till Signes vikt och längd för att börja
              bygga hennes tillväxtkurvor.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <CollapsibleCard
            title="Viktutveckling"
            icon={<Scale size={28} />}
            isCollapsed={isWeightChartCollapsed}
            onToggle={() =>
              setIsWeightChartCollapsed((current) => !current)
            }
          >
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 15,
                    left: -15,
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
                    domain={["dataMin - 0.5", "dataMax + 0.5"]}
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
          </CollapsibleCard>

          <CollapsibleCard
            title="Längdutveckling"
            icon={<Ruler size={28} />}
            isCollapsed={isHeightChartCollapsed}
            onToggle={() =>
              setIsHeightChartCollapsed((current) => !current)
            }
          >
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 15,
                    left: -15,
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
                    domain={["dataMin - 2", "dataMax + 2"]}
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
          </CollapsibleCard>
        </>
      )}

      {measurements.length > 0 && (
        <CollapsibleCard
          title="Mäthistorik"
          icon={<CalendarDays size={28} />}
          isCollapsed={isHistoryCollapsed}
          onToggle={() =>
            setIsHistoryCollapsed((current) => !current)
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {[...measurements]
              .reverse()
              .map((measurement) => {
                const isDeleting =
                  deletingId === measurement.id;

                return (
                  <article
                    key={measurement.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
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
                        void removeMeasurement(measurement.id)
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
        </CollapsibleCard>
      )}

      <p className="text-xs leading-5 text-slate-500">
        Tillväxtloggen är en privat familjeöversikt och ersätter
        inte BVC:s eller vårdens medicinska bedömningar.
      </p>
    </div>
  );
}