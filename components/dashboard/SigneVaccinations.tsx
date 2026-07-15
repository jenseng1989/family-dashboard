"use client";

import {
  CalendarDays,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Syringe,
  Trash2,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";

type Vaccination = {
  id: string;
  vaccine_name: string;
  vaccination_date: string;
  dose: string | null;
  notes: string | null;
  created_at: string;
};

function getTodayDateString(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  return new Date(year, month - 1, day);
}

function formatDate(dateString: string): string {
  return parseLocalDate(dateString).toLocaleDateString(
    "sv-SE",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

export default function SigneVaccinations() {
  const [vaccinations, setVaccinations] = useState<
    Vaccination[]
  >([]);

  const [vaccineName, setVaccineName] = useState("");
  const [vaccinationDate, setVaccinationDate] =
    useState(getTodayDateString());
  const [dose, setDose] = useState("");
  const [notes, setNotes] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<
    string | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<
    string | null
  >(null);

  const loadVaccinations = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("signe_vaccinations")
      .select(
        "id, vaccine_name, vaccination_date, dose, notes, created_at"
      )
      .order("vaccination_date", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Kunde inte hämta vaccinationerna:",
        error
      );

      setErrorMessage(
        "Kunde inte hämta vaccinationshistoriken."
      );
      setIsLoading(false);
      return;
    }

    setVaccinations(data ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadVaccinations();
  }, [loadVaccinations]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedName = vaccineName.trim();
    const trimmedDose = dose.trim();
    const trimmedNotes = notes.trim();

    if (
      !trimmedName ||
      !vaccinationDate ||
      isSaving
    ) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("signe_vaccinations")
      .insert({
        vaccine_name: trimmedName,
        vaccination_date: vaccinationDate,
        dose: trimmedDose || null,
        notes: trimmedNotes || null,
      })
      .select(
        "id, vaccine_name, vaccination_date, dose, notes, created_at"
      )
      .single();

    if (error) {
      console.error(
        "Kunde inte spara vaccinationen:",
        error
      );

      setErrorMessage(
        "Vaccinationen kunde inte sparas."
      );
      setIsSaving(false);
      return;
    }

    setVaccinations((currentVaccinations) =>
      [data, ...currentVaccinations].sort(
        (firstVaccination, secondVaccination) =>
          parseLocalDate(
            secondVaccination.vaccination_date
          ).getTime() -
          parseLocalDate(
            firstVaccination.vaccination_date
          ).getTime()
      )
    );

    setVaccineName("");
    setVaccinationDate(getTodayDateString());
    setDose("");
    setNotes("");
    setIsSaving(false);
  }

  async function removeVaccination(id: string) {
    if (deletingId !== null) {
      return;
    }

    setDeletingId(id);
    setErrorMessage(null);

    const { error } = await supabase
      .from("signe_vaccinations")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(
        "Kunde inte ta bort vaccinationen:",
        error
      );

      setErrorMessage(
        "Vaccinationen kunde inte tas bort."
      );
      setDeletingId(null);
      return;
    }

    setVaccinations((currentVaccinations) =>
      currentVaccinations.filter(
        (vaccination) => vaccination.id !== id
      )
    );

    setDeletingId(null);
  }

  return (
    <Card
      title="Vaccinationer"
      icon={<Syringe size={28} />}
      defaultCollapsed
    >
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-white/5 p-4"
      >
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
              max={getTodayDateString()}
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
              onChange={(event) =>
                setDose(event.target.value)
              }
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
              onChange={(event) =>
                setNotes(event.target.value)
              }
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
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          {isSaving ? (
            <LoaderCircle
              size={19}
              className="animate-spin"
            />
          ) : (
            <Plus size={19} />
          )}

          {isSaving
            ? "Sparar…"
            : "Spara vaccination"}
        </button>
      </form>

      {errorMessage && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-red-200">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadVaccinations()
            }
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-300/20 bg-red-300/10 px-3 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-300/20"
          >
            <RefreshCw size={16} />
            Hämta igen
          </button>
        </div>
      )}

      <div className="mt-5">
        {isLoading ? (
          <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-6">
            <LoaderCircle
              size={30}
              className="animate-spin text-blue-300"
            />

            <p className="text-sm text-slate-400">
              Hämtar vaccinationerna…
            </p>
          </div>
        ) : vaccinations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
            <ShieldCheck
              size={36}
              className="mx-auto text-blue-300"
            />

            <p className="mt-3 font-semibold text-white">
              Inga vaccinationer registrerade
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Lägg till Signes vaccinationer ovan.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {vaccinations.map((vaccination) => {
              const isDeleting =
                deletingId === vaccination.id;

              return (
                <article
                  key={vaccination.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <ShieldCheck
                          size={18}
                          className="shrink-0 text-emerald-300"
                        />

                        <h3 className="break-words text-lg font-semibold text-white">
                          {vaccination.vaccine_name}
                        </h3>
                      </div>

                      {vaccination.dose && (
                        <p className="mt-2 text-sm font-medium text-blue-300">
                          {vaccination.dose}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={deletingId !== null}
                      onClick={() =>
                        void removeVaccination(
                          vaccination.id
                        )
                      }
                      aria-label={`Ta bort ${vaccination.vaccine_name}`}
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
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                    <CalendarDays size={16} />

                    <span className="capitalize">
                      {formatDate(
                        vaccination.vaccination_date
                      )}
                    </span>
                  </div>

                  {vaccination.notes && (
                    <p className="mt-3 rounded-xl bg-slate-950/30 p-3 text-sm leading-6 text-slate-300">
                      {vaccination.notes}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Informationen är en egen familjelogg. Kontrollera
        alltid officiella vaccinationsuppgifter med BVC eller
        vården.
      </p>
    </Card>
  );
}