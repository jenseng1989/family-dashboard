"use client";

import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Syringe,
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

type Vaccination = {
  id: string;
  member_id: string;
  vaccine_name: string;
  vaccination_date: string;
  dose: string | null;
  notes: string | null;
  created_at: string;
};

type ChildVaccinationsProps = {
  memberId: string;
  displayName: string;
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

function formatDate(dateString: string): string {
  return parseLocalDate(dateString).toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function daysBetween(startDate: string, endDate: string): number {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  const startUtc = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );

  const endUtc = Date.UTC(
    end.getFullYear(),
    end.getMonth(),
    end.getDate()
  );

  return Math.round((endUtc - startUtc) / 86_400_000);
}

function getCountdownText(dateString: string): string {
  const days = daysBetween(getTodayDateString(), dateString);

  if (days === 0) return "Idag";
  if (days === 1) return "Imorgon";
  if (days > 1) return `Om ${days} dagar`;
  if (days === -1) return "Igår";

  return `${Math.abs(days)} dagar sedan`;
}

export default function ChildVaccinations({
  memberId,
  displayName,
}: ChildVaccinationsProps) {
  const [vaccinations, setVaccinations] = useState<Vaccination[]>(
    []
  );

  const [vaccineName, setVaccineName] = useState("");
  const [vaccinationDate, setVaccinationDate] = useState(
    getTodayDateString()
  );
  const [dose, setDose] = useState("");
  const [notes, setNotes] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null
  );

  const loadVaccinations = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("signe_vaccinations")
      .select(
        "id, member_id, vaccine_name, vaccination_date, dose, notes, created_at"
      )
      .eq("member_id", memberId)
      .order("vaccination_date", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error(
        `Kunde inte hämta vaccinationerna för ${displayName}:`,
        error
      );

      setErrorMessage("Kunde inte hämta vaccinationshistoriken.");
      setIsLoading(false);
      return;
    }

    setVaccinations((data ?? []) as Vaccination[]);
    setIsLoading(false);
  }, [memberId, displayName]);

  useEffect(() => {
    void loadVaccinations();
  }, [loadVaccinations]);

  const today = getTodayDateString();

  const completedVaccinations = useMemo(
    () =>
      vaccinations
        .filter(
          (vaccination) => vaccination.vaccination_date <= today
        )
        .sort(
          (first, second) =>
            parseLocalDate(second.vaccination_date).getTime() -
            parseLocalDate(first.vaccination_date).getTime()
        ),
    [vaccinations, today]
  );

  const upcomingVaccinations = useMemo(
    () =>
      vaccinations
        .filter(
          (vaccination) => vaccination.vaccination_date > today
        )
        .sort(
          (first, second) =>
            parseLocalDate(first.vaccination_date).getTime() -
            parseLocalDate(second.vaccination_date).getTime()
        ),
    [vaccinations, today]
  );

  const nextVaccination = upcomingVaccinations[0] ?? null;
  const latestCompleted = completedVaccinations[0] ?? null;

  function resetForm() {
    setEditingId(null);
    setVaccineName("");
    setVaccinationDate(getTodayDateString());
    setDose("");
    setNotes("");
  }

  function openNewVaccinationForm() {
    resetForm();
    setFormOpen(true);
    setErrorMessage(null);
  }

  function startEditing(vaccination: Vaccination) {
    setEditingId(vaccination.id);
    setVaccineName(vaccination.vaccine_name);
    setVaccinationDate(vaccination.vaccination_date);
    setDose(vaccination.dose ?? "");
    setNotes(vaccination.notes ?? "");
    setFormOpen(true);
    setErrorMessage(null);
  }

  function closeForm() {
    if (isSaving) return;

    resetForm();
    setFormOpen(false);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedName = vaccineName.trim();
    const trimmedDose = dose.trim();
    const trimmedNotes = notes.trim();

    if (!trimmedName || !vaccinationDate || isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    if (editingId) {
      const { data, error } = await supabase
        .from("signe_vaccinations")
        .update({
          vaccine_name: trimmedName,
          vaccination_date: vaccinationDate,
          dose: trimmedDose || null,
          notes: trimmedNotes || null,
        })
        .eq("id", editingId)
        .eq("member_id", memberId)
        .select(
          "id, member_id, vaccine_name, vaccination_date, dose, notes, created_at"
        )
        .single();

      if (error) {
        console.error(
          `Kunde inte uppdatera vaccinationen för ${displayName}:`,
          error
        );

        setErrorMessage("Vaccinationen kunde inte uppdateras.");
        setIsSaving(false);
        return;
      }

      setVaccinations((current) =>
        current
          .map((vaccination) =>
            vaccination.id === editingId
              ? (data as Vaccination)
              : vaccination
          )
          .sort(
            (first, second) =>
              parseLocalDate(first.vaccination_date).getTime() -
              parseLocalDate(second.vaccination_date).getTime()
          )
      );
    } else {
      const { data, error } = await supabase
        .from("signe_vaccinations")
        .insert({
          member_id: memberId,
          vaccine_name: trimmedName,
          vaccination_date: vaccinationDate,
          dose: trimmedDose || null,
          notes: trimmedNotes || null,
        })
        .select(
          "id, member_id, vaccine_name, vaccination_date, dose, notes, created_at"
        )
        .single();

      if (error) {
        console.error(
          `Kunde inte spara vaccinationen för ${displayName}:`,
          error
        );

        setErrorMessage("Vaccinationen kunde inte sparas.");
        setIsSaving(false);
        return;
      }

      setVaccinations((current) =>
        [...current, data as Vaccination].sort(
          (first, second) =>
            parseLocalDate(first.vaccination_date).getTime() -
            parseLocalDate(second.vaccination_date).getTime()
        )
      );
    }

    resetForm();
    setFormOpen(false);
    setIsSaving(false);
  }

  async function removeVaccination(vaccination: Vaccination) {
    if (deletingId !== null) return;

    const confirmed = window.confirm(
      `Ta bort ${vaccination.vaccine_name} från ${displayName}s vaccinationslogg?`
    );

    if (!confirmed) return;

    setDeletingId(vaccination.id);
    setErrorMessage(null);

    const { error } = await supabase
      .from("signe_vaccinations")
      .delete()
      .eq("id", vaccination.id)
      .eq("member_id", memberId);

    if (error) {
      console.error(
        `Kunde inte ta bort vaccinationen för ${displayName}:`,
        error
      );

      setErrorMessage("Vaccinationen kunde inte tas bort.");
      setDeletingId(null);
      return;
    }

    setVaccinations((current) =>
      current.filter((item) => item.id !== vaccination.id)
    );

    if (editingId === vaccination.id) {
      resetForm();
      setFormOpen(false);
    }

    setDeletingId(null);
  }

  function VaccinationCard({
    vaccination,
    upcoming = false,
  }: {
    vaccination: Vaccination;
    upcoming?: boolean;
  }) {
    const isDeleting = deletingId === vaccination.id;

    return (
      <article
        className={[
          "rounded-2xl border p-4 transition",
          upcoming
            ? "border-amber-300/15 bg-amber-400/[0.055]"
            : "border-white/10 bg-white/[0.04] hover:bg-white/[0.065]",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-start gap-2">
              {upcoming ? (
                <Clock3
                  size={18}
                  className="mt-0.5 shrink-0 text-amber-300"
                />
              ) : (
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-emerald-300"
                />
              )}

              <div className="min-w-0">
                <h3 className="break-words font-semibold text-white">
                  {vaccination.vaccine_name}
                </h3>

                {vaccination.dose && (
                  <p
                    className={[
                      "mt-1 text-sm font-medium",
                      upcoming
                        ? "text-amber-200"
                        : "text-blue-300",
                    ].join(" ")}
                  >
                    {vaccination.dose}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => startEditing(vaccination)}
              disabled={deletingId !== null}
              aria-label={`Redigera ${vaccination.vaccine_name}`}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:border-blue-300/25 hover:bg-blue-400/10 hover:text-blue-200 disabled:opacity-40"
            >
              <Pencil size={16} />
            </button>

            <button
              type="button"
              disabled={deletingId !== null}
              onClick={() => void removeVaccination(vaccination)}
              aria-label={`Ta bort ${vaccination.vaccine_name}`}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-300 disabled:cursor-wait disabled:opacity-50"
            >
              {isDeleting ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="flex items-center gap-2 capitalize text-slate-400">
            <CalendarDays size={15} />
            {formatDate(vaccination.vaccination_date)}
          </span>

          {upcoming && (
            <span className="font-semibold text-amber-300">
              {getCountdownText(vaccination.vaccination_date)}
            </span>
          )}
        </div>

        {vaccination.notes && (
          <p className="mt-3 rounded-xl bg-slate-950/30 p-3 text-sm leading-6 text-slate-300">
            {vaccination.notes}
          </p>
        )}
      </article>
    );
  }

  return (
    <Card
      title="Vaccinationer"
      icon={<Syringe size={28} />}
      storageKey={`child-${memberId}-vaccinations`}
    >
      {isLoading ? (
        <div className="flex min-h-52 flex-col items-center justify-center gap-3">
          <LoaderCircle
            size={32}
            className="animate-spin text-blue-300"
          />

          <p className="text-sm text-slate-400">
            Hämtar vaccinationerna…
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.06] p-4">
              <div className="flex items-center gap-2 text-emerald-300">
                <ShieldCheck size={17} />

                <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                  Genomförda
                </p>
              </div>

              <p className="mt-3 text-3xl font-black text-white">
                {completedVaccinations.length}
              </p>

              {latestCompleted && (
                <p className="mt-2 text-xs text-slate-500">
                  Senast: {latestCompleted.vaccine_name}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-amber-300/15 bg-amber-400/[0.06] p-4">
              <div className="flex items-center gap-2 text-amber-300">
                <CalendarClock size={17} />

                <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                  Kommande
                </p>
              </div>

              <p className="mt-3 text-3xl font-black text-white">
                {upcomingVaccinations.length}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Planerade vaccinationer
              </p>
            </div>

            <div className="rounded-2xl border border-blue-300/15 bg-blue-400/[0.06] p-4">
              <div className="flex items-center gap-2 text-blue-300">
                <Syringe size={17} />

                <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                  Totalt
                </p>
              </div>

              <p className="mt-3 text-3xl font-black text-white">
                {vaccinations.length}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Registrerade poster
              </p>
            </div>
          </div>

          {nextVaccination ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-amber-300/20 bg-gradient-to-br from-amber-400/10 to-orange-400/[0.04] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-amber-300">
                    <CalendarClock size={19} />

                    <p className="text-xs font-semibold uppercase tracking-[0.16em]">
                      Nästa vaccination
                    </p>
                  </div>

                  <h3 className="mt-3 text-xl font-bold text-white">
                    {nextVaccination.vaccine_name}
                  </h3>

                  {nextVaccination.dose && (
                    <p className="mt-1 font-medium text-amber-100">
                      {nextVaccination.dose}
                    </p>
                  )}

                  <p className="mt-3 flex items-center gap-2 text-sm capitalize text-slate-300">
                    <CalendarDays size={16} />
                    {formatDate(nextVaccination.vaccination_date)}
                  </p>

                  {nextVaccination.notes && (
                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      {nextVaccination.notes}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-amber-300/15 bg-slate-950/25 px-4 py-3 text-center">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                    Kvar
                  </p>

                  <p className="mt-1 font-bold text-amber-200">
                    {getCountdownText(
                      nextVaccination.vaccination_date
                    )}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-white/15 bg-white/[0.025] p-5">
              <div className="flex items-center gap-3">
                <ShieldCheck
                  size={26}
                  className="shrink-0 text-emerald-300"
                />

                <div>
                  <p className="font-semibold text-white">
                    Ingen kommande vaccination registrerad
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Lägg till nästa planerade vaccination när ni har
                    fått datum från BVC.
                  </p>
                </div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-red-200">
                {errorMessage}
              </p>

              <button
                type="button"
                onClick={() => void loadVaccinations()}
                className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-300/20 bg-red-300/10 px-3 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-300/20"
              >
                <RefreshCw size={16} />
                Hämta igen
              </button>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openNewVaccinationForm}
              className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400"
            >
              <Plus size={17} />
              Lägg till vaccination
            </button>

            {upcomingVaccinations.length > 1 && (
              <p className="flex items-center text-sm text-slate-500">
                {upcomingVaccinations.length - 1} ytterligare kommande
              </p>
            )}
          </div>

          {formOpen && (
            <form
              onSubmit={handleSubmit}
              className="mt-4 rounded-2xl border border-blue-300/15 bg-blue-400/[0.045] p-4"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-white">
                    {editingId
                      ? "Redigera vaccination"
                      : "Lägg till vaccination"}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Datum i framtiden visas som planerad vaccination.
                    När datumet passerat hamnar den automatiskt bland
                    genomförda.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSaving}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="Stäng formuläret"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">
                    Vaccin
                  </span>

                  <input
                    type="text"
                    value={vaccineName}
                    onChange={(event) =>
                      setVaccineName(event.target.value)
                    }
                    placeholder="Till exempel Rotavirus"
                    maxLength={100}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">
                    Datum
                  </span>

                  <input
                    type="date"
                    value={vaccinationDate}
                    onChange={(event) =>
                      setVaccinationDate(event.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">
                    Dos
                  </span>

                  <input
                    type="text"
                    value={dose}
                    onChange={(event) => setDose(event.target.value)}
                    placeholder="Till exempel Dos 1"
                    maxLength={50}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">
                    Anteckning
                  </span>

                  <input
                    type="text"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Valfri kort anteckning"
                    maxLength={500}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={
                  !vaccineName.trim() ||
                  !vaccinationDate ||
                  isSaving
                }
                className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSaving ? (
                  <LoaderCircle size={19} className="animate-spin" />
                ) : editingId ? (
                  <Pencil size={18} />
                ) : (
                  <Plus size={19} />
                )}

                {isSaving
                  ? "Sparar…"
                  : editingId
                    ? "Spara ändringar"
                    : "Spara vaccination"}
              </button>
            </form>
          )}

          {upcomingVaccinations.length > 1 && (
            <div className="mt-5">
              <div className="mb-3 flex items-center gap-2">
                <CalendarClock
                  size={18}
                  className="text-amber-300"
                />

                <p className="font-semibold text-white">
                  Kommande vaccinationer
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {upcomingVaccinations.slice(1).map((vaccination) => (
                  <VaccinationCard
                    key={vaccination.id}
                    vaccination={vaccination}
                    upcoming
                  />
                ))}
              </div>
            </div>
          )}

          {completedVaccinations.length > 0 && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02]">
              <button
                type="button"
                onClick={() =>
                  setHistoryOpen((current) => !current)
                }
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck
                    size={20}
                    className="text-emerald-300"
                  />

                  <div>
                    <p className="font-semibold text-white">
                      Genomförda vaccinationer
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      {completedVaccinations.length} registrerade
                    </p>
                  </div>
                </div>

                {historyOpen ? (
                  <ChevronUp size={19} className="text-slate-400" />
                ) : (
                  <ChevronDown size={19} className="text-slate-400" />
                )}
              </button>

              {historyOpen && (
                <div className="border-t border-white/10 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {completedVaccinations.map((vaccination) => (
                      <VaccinationCard
                        key={vaccination.id}
                        vaccination={vaccination}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {vaccinations.length === 0 && !formOpen && (
            <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
              <ShieldCheck
                size={36}
                className="mx-auto text-blue-300"
              />

              <p className="mt-3 font-semibold text-white">
                Inga vaccinationer registrerade
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Lägg till både genomförda och planerade vaccinationer.
              </p>
            </div>
          )}

          <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-slate-500">
            Vaccinationsdelen är en egen familjelogg för{" "}
            {displayName}. Datum och vaccinationsuppgifter ska alltid
            kontrolleras mot BVC, journalen eller annan information
            från vården.
          </p>
        </>
      )}
    </Card>
  );
}