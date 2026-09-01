"use client";

import {
  CalendarDays,
  Check,
  LoaderCircle,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";

type ToothRow = {
  id: string;
  member_id: string;
  tooth_code: string;
  tooth_name: string;
  eruption_date: string;
  created_at: string;
};

type ToothDefinition = {
  code: string;
  name: string;
  shortName: string;
  arch: "upper" | "lower";
  side: "left" | "right";
  order: number;
};

type ChildTeethProps = {
  memberId: string;
  displayName: string;
};

const TEETH: ToothDefinition[] = [
  { code: "U-R-2M", name: "Övre höger andra kindtand", shortName: "2:a kindtand", arch: "upper", side: "right", order: 1 },
  { code: "U-R-1M", name: "Övre höger första kindtand", shortName: "1:a kindtand", arch: "upper", side: "right", order: 2 },
  { code: "U-R-C", name: "Övre höger hörntand", shortName: "Hörntand", arch: "upper", side: "right", order: 3 },
  { code: "U-R-LI", name: "Övre höger lateral framtand", shortName: "Yttre framtand", arch: "upper", side: "right", order: 4 },
  { code: "U-R-CI", name: "Övre höger central framtand", shortName: "Framtand", arch: "upper", side: "right", order: 5 },
  { code: "U-L-CI", name: "Övre vänster central framtand", shortName: "Framtand", arch: "upper", side: "left", order: 6 },
  { code: "U-L-LI", name: "Övre vänster lateral framtand", shortName: "Yttre framtand", arch: "upper", side: "left", order: 7 },
  { code: "U-L-C", name: "Övre vänster hörntand", shortName: "Hörntand", arch: "upper", side: "left", order: 8 },
  { code: "U-L-1M", name: "Övre vänster första kindtand", shortName: "1:a kindtand", arch: "upper", side: "left", order: 9 },
  { code: "U-L-2M", name: "Övre vänster andra kindtand", shortName: "2:a kindtand", arch: "upper", side: "left", order: 10 },

  { code: "L-R-2M", name: "Nedre höger andra kindtand", shortName: "2:a kindtand", arch: "lower", side: "right", order: 1 },
  { code: "L-R-1M", name: "Nedre höger första kindtand", shortName: "1:a kindtand", arch: "lower", side: "right", order: 2 },
  { code: "L-R-C", name: "Nedre höger hörntand", shortName: "Hörntand", arch: "lower", side: "right", order: 3 },
  { code: "L-R-LI", name: "Nedre höger lateral framtand", shortName: "Yttre framtand", arch: "lower", side: "right", order: 4 },
  { code: "L-R-CI", name: "Nedre höger central framtand", shortName: "Framtand", arch: "lower", side: "right", order: 5 },
  { code: "L-L-CI", name: "Nedre vänster central framtand", shortName: "Framtand", arch: "lower", side: "left", order: 6 },
  { code: "L-L-LI", name: "Nedre vänster lateral framtand", shortName: "Yttre framtand", arch: "lower", side: "left", order: 7 },
  { code: "L-L-C", name: "Nedre vänster hörntand", shortName: "Hörntand", arch: "lower", side: "left", order: 8 },
  { code: "L-L-1M", name: "Nedre vänster första kindtand", shortName: "1:a kindtand", arch: "lower", side: "left", order: 9 },
  { code: "L-L-2M", name: "Nedre vänster andra kindtand", shortName: "2:a kindtand", arch: "lower", side: "left", order: 10 },
];

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

function formatDate(dateString: string): string {
  return parseLocalDate(dateString).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ChildTeeth({
  memberId,
  displayName,
}: ChildTeethProps) {
  const [teeth, setTeeth] = useState<ToothRow[]>([]);
  const [selectedTooth, setSelectedTooth] =
    useState<ToothDefinition | null>(null);

  const [eruptionDate, setEruptionDate] =
    useState(getTodayDateString());

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null
  );

  const loadTeeth = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("signe_teeth")
      .select(
        "id, member_id, tooth_code, tooth_name, eruption_date, created_at"
      )
      .eq("member_id", memberId)
      .order("eruption_date", { ascending: true });

    if (error) {
      console.error(
        `Kunde inte hämta tänder för ${displayName}:`,
        error
      );

      setErrorMessage(
        "Kunde inte hämta tandinformationen från databasen."
      );

      setIsLoading(false);
      return;
    }

    setTeeth((data ?? []) as ToothRow[]);
    setIsLoading(false);
  }, [memberId, displayName]);

  useEffect(() => {
    void loadTeeth();
  }, [loadTeeth]);

  const registeredCodes = useMemo(
    () => new Set(teeth.map((tooth) => tooth.tooth_code)),
    [teeth]
  );

  const upperTeeth = TEETH.filter((tooth) => tooth.arch === "upper");
  const lowerTeeth = TEETH.filter((tooth) => tooth.arch === "lower");

  const latestTooth =
    teeth.length > 0 ? teeth[teeth.length - 1] : null;

  function selectTooth(tooth: ToothDefinition) {
    if (registeredCodes.has(tooth.code)) {
      return;
    }

    setSelectedTooth(tooth);
    setEruptionDate(getTodayDateString());
    setErrorMessage(null);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!selectedTooth || !eruptionDate || isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("signe_teeth")
      .insert({
        member_id: memberId,
        tooth_code: selectedTooth.code,
        tooth_name: selectedTooth.name,
        eruption_date: eruptionDate,
      })
      .select(
        "id, member_id, tooth_code, tooth_name, eruption_date, created_at"
      )
      .single();

    if (error) {
      console.error(
        `Kunde inte spara tanden för ${displayName}:`,
        error
      );

      if (error.code === "23505") {
        setErrorMessage("Den tanden är redan registrerad.");
      } else {
        setErrorMessage("Tanden kunde inte sparas.");
      }

      setIsSaving(false);
      return;
    }

    setTeeth((current) =>
      [...current, data as ToothRow].sort(
        (first, second) =>
          parseLocalDate(first.eruption_date).getTime() -
          parseLocalDate(second.eruption_date).getTime()
      )
    );

    setSelectedTooth(null);
    setIsSaving(false);
  }

  async function removeTooth(tooth: ToothRow) {
    if (deletingId !== null) {
      return;
    }

    const confirmed = window.confirm(
      `Ta bort ${tooth.tooth_name.toLocaleLowerCase(
        "sv-SE"
      )} från ${displayName}s tandlogg?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(tooth.id);
    setErrorMessage(null);

    const { error } = await supabase
      .from("signe_teeth")
      .delete()
      .eq("id", tooth.id)
      .eq("member_id", memberId);

    if (error) {
      console.error(
        `Kunde inte ta bort tanden för ${displayName}:`,
        error
      );

      setErrorMessage("Tanden kunde inte tas bort.");
      setDeletingId(null);
      return;
    }

    setTeeth((current) =>
      current.filter((item) => item.id !== tooth.id)
    );

    setDeletingId(null);
  }

  function ToothButton({
    tooth,
  }: {
    tooth: ToothDefinition;
  }) {
    const registered = registeredCodes.has(tooth.code);

    return (
      <button
        type="button"
        disabled={registered}
        onClick={() => selectTooth(tooth)}
        title={tooth.name}
        className={[
          "group flex min-w-0 flex-col items-center gap-1 rounded-xl border px-1 py-2 transition",
          registered
            ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
            : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-amber-300/30 hover:bg-amber-400/10 hover:text-white",
        ].join(" ")}
      >
        <div
          className={[
            "relative flex h-10 w-8 items-center justify-center rounded-b-[45%] rounded-t-[35%] border shadow-sm sm:h-12 sm:w-9",
            registered
              ? "border-emerald-200/35 bg-emerald-100 text-emerald-700"
              : "border-slate-300/30 bg-slate-100 text-slate-600 group-hover:bg-amber-50",
          ].join(" ")}
        >
          {registered && <Check size={16} strokeWidth={3} />}
        </div>

        <span className="hidden max-w-full truncate text-[10px] text-slate-500 lg:block">
          {tooth.shortName}
        </span>
      </button>
    );
  }

  return (
    <Card
      title="Tänder"
      icon={<span className="text-2xl">🦷</span>}
      storageKey={`child-${memberId}-teeth`}
    >
      {isLoading ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3">
          <LoaderCircle
            size={32}
            className="animate-spin text-amber-300"
          />

          <p className="text-sm text-slate-400">
            Hämtar {displayName}s tänder…
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-amber-300/15 bg-amber-400/[0.06] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-300">
                Tänder
              </p>

              <p className="mt-2 text-3xl font-black text-white">
                {teeth.length}
                <span className="ml-1 text-base font-semibold text-slate-500">
                  / 20
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.06] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">
                Kvar
              </p>

              <p className="mt-2 text-3xl font-black text-white">
                {20 - teeth.length}
              </p>
            </div>

            <div className="rounded-2xl border border-violet-300/15 bg-violet-400/[0.06] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-300">
                Senaste tanden
              </p>

              {latestTooth ? (
                <>
                  <p className="mt-2 text-sm font-bold text-white">
                    {latestTooth.tooth_name}
                  </p>

                  <p className="mt-1 text-xs capitalize text-slate-500">
                    {formatDate(latestTooth.eruption_date)}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm font-semibold text-slate-400">
                  Ingen registrerad ännu
                </p>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-red-200">
                {errorMessage}
              </p>

              <button
                type="button"
                onClick={() => void loadTeeth()}
                className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-300/20 bg-red-300/10 px-3 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-300/20"
              >
                <RefreshCw size={16} />
                Hämta igen
              </button>
            </div>
          )}

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <Sparkles
                size={20}
                className="mt-0.5 shrink-0 text-amber-300"
              />

              <div>
                <p className="font-semibold text-white">
                  {displayName}s tandkarta
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  Klicka på en tand när den har brutit fram och
                  registrera datumet.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Överkäke
              </p>

              <div className="grid grid-cols-10 gap-1 sm:gap-2">
                {upperTeeth.map((tooth) => (
                  <ToothButton key={tooth.code} tooth={tooth} />
                ))}
              </div>

              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />

                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                  Mun
                </span>

                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="grid grid-cols-10 gap-1 sm:gap-2">
                {lowerTeeth.map((tooth) => (
                  <ToothButton key={tooth.code} tooth={tooth} />
                ))}
              </div>

              <p className="mt-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Underkäke
              </p>
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded border border-slate-300/30 bg-slate-100" />
                Inte registrerad
              </span>

              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded border border-emerald-300/30 bg-emerald-100" />
                Har kommit
              </span>
            </div>
          </div>

          {selectedTooth && (
            <form
              onSubmit={handleSubmit}
              className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/[0.06] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-white">
                    Registrera tand
                  </p>

                  <p className="mt-1 text-sm text-amber-100">
                    {selectedTooth.name}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTooth(null)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="Stäng"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-300">
                    Datum tanden upptäcktes
                  </span>

                  <input
                    type="date"
                    value={eruptionDate}
                    max={getTodayDateString()}
                    onChange={(event) =>
                      setEruptionDate(event.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-amber-300/40 focus:ring-2 focus:ring-amber-300/10"
                  />
                </label>

                <button
                  type="submit"
                  disabled={!eruptionDate || isSaving}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSaving ? (
                    <LoaderCircle
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <Plus size={18} />
                  )}

                  Spara tand
                </button>
              </div>
            </form>
          )}

          {teeth.length > 0 && (
            <div className="mt-5">
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays
                  size={18}
                  className="text-amber-300"
                />

                <p className="font-semibold text-white">
                  Tandhistorik
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[...teeth].reverse().map((tooth, index) => {
                  const isDeleting = deletingId === tooth.id;

                  return (
                    <article
                      key={tooth.id}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-lg">
                          🦷
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-white">
                            Tand {teeth.length - index}
                          </p>

                          <p className="mt-0.5 text-sm text-slate-300">
                            {tooth.tooth_name}
                          </p>

                          <p className="mt-1 text-xs capitalize text-slate-500">
                            {formatDate(tooth.eruption_date)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={deletingId !== null}
                        onClick={() => void removeTooth(tooth)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-300 disabled:opacity-40"
                        aria-label={`Ta bort ${tooth.tooth_name}`}
                      >
                        {isDeleting ? (
                          <LoaderCircle
                            size={17}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2 size={17} />
                        )}
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-slate-500">
            Tandkartan är en familjelogg över när ni upptäcker{" "}
            {displayName}s mjölktänder. Datumet behöver inte vara
            exakt den dag tanden började bryta fram.
          </p>
        </>
      )}
    </Card>
  );
}