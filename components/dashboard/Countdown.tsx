"use client";

import {
  CalendarDays,
  CalendarPlus,
  Clock3,
  LoaderCircle,
  PartyPopper,
  RefreshCw,
  Trash2,
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

type CountdownDatabaseRow = {
  id: string;
  title: string;
  event_date: string;
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

function getDaysRemaining(dateString: string): number {
  const now = new Date();

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const targetDate = parseLocalDate(dateString);
  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  return Math.round(
    (targetDate.getTime() - today.getTime()) /
      millisecondsPerDay
  );
}

function formatCountdown(
  title: string,
  daysRemaining: number
): string {
  if (daysRemaining === 0) {
    return `${title} är idag`;
  }

  if (daysRemaining === 1) {
    return `${title} är imorgon`;
  }

  if (daysRemaining > 1) {
    return `${title} är om ${daysRemaining} dagar`;
  }

  if (daysRemaining === -1) {
    return `${title} var igår`;
  }

  return `${title} var för ${Math.abs(
    daysRemaining
  )} dagar sedan`;
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

export default function Countdown() {
  const [events, setEvents] = useState<
    CountdownDatabaseRow[]
  >([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<
    string | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<
    string | null
  >(null);

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("countdowns")
      .select("id, title, event_date, created_at")
      .order("event_date", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error(
        "Kunde inte hämta nedräkningar:",
        error
      );

      setErrorMessage(
        "Kunde inte hämta nedräkningarna från databasen."
      );
      setIsLoading(false);
      return;
    }

    setEvents(data ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const sortedEvents = useMemo(() => {
    return [...events].sort((firstEvent, secondEvent) => {
      return (
        parseLocalDate(
          firstEvent.event_date
        ).getTime() -
        parseLocalDate(
          secondEvent.event_date
        ).getTime()
      );
    });
  }, [events]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedTitle = title.trim();

    if (!trimmedTitle || !date || isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("countdowns")
      .insert({
        title: trimmedTitle,
        event_date: date,
      })
      .select("id, title, event_date, created_at")
      .single();

    if (error) {
      console.error(
        "Kunde inte lägga till nedräkning:",
        error
      );

      setErrorMessage(
        "Nedräkningen kunde inte sparas."
      );
      setIsSaving(false);
      return;
    }

    setEvents((currentEvents) => [
      ...currentEvents,
      data,
    ]);

    setTitle("");
    setDate("");
    setIsSaving(false);
  }

  async function removeEvent(id: string) {
    if (deletingId) {
      return;
    }

    setDeletingId(id);
    setErrorMessage(null);

    const { error } = await supabase
      .from("countdowns")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(
        "Kunde inte ta bort nedräkning:",
        error
      );

      setErrorMessage(
        "Nedräkningen kunde inte tas bort."
      );
      setDeletingId(null);
      return;
    }

    setEvents((currentEvents) =>
      currentEvents.filter(
        (countdownEvent) =>
          countdownEvent.id !== id
      )
    );

    setDeletingId(null);
  }

  return (
    <Card
      title="Nedräkningar"
      icon={<Clock3 size={28} />}
    >
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-white/5 p-4"
      >
        <div className="grid gap-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Händelse
            </span>

            <input
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="Till exempel Semester"
              maxLength={60}
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-[220px_1fr] sm:items-end">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                Datum
              </span>

              <input
                type="date"
                value={date}
                min={getTodayDateString()}
                onChange={(event) =>
                  setDate(event.target.value)
                }
                className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
              />
            </label>

            <button
              type="submit"
              disabled={
                !title.trim() ||
                !date ||
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
                <CalendarPlus size={19} />
              )}

              {isSaving ? "Sparar…" : "Lägg till"}
            </button>
          </div>
        </div>
      </form>

      {errorMessage && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-red-200">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() => void loadEvents()}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-300/20 bg-red-300/10 px-3 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-300/20"
          >
            <RefreshCw size={16} />
            Försök igen
          </button>
        </div>
      )}

      <div className="mt-5">
        {isLoading ? (
          <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
            <LoaderCircle
              size={30}
              className="animate-spin text-blue-300"
            />

            <p className="text-sm text-slate-400">
              Hämtar nedräkningarna…
            </p>
          </div>
        ) : sortedEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
            <PartyPopper
              size={34}
              className="mx-auto text-blue-300"
            />

            <p className="mt-3 font-semibold text-white">
              Inga nedräkningar ännu
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Lägg till exempelvis semester,
              födelsedagar eller utflykter.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {sortedEvents.map(
              (countdownEvent) => {
                const daysRemaining =
                  getDaysRemaining(
                    countdownEvent.event_date
                  );

                const isToday =
                  daysRemaining === 0;
                const hasPassed =
                  daysRemaining < 0;
                const isDeleting =
                  deletingId ===
                  countdownEvent.id;

                return (
                  <article
                    key={countdownEvent.id}
                    className={[
                      "relative overflow-hidden rounded-2xl border p-5",
                      "transition duration-300 hover:-translate-y-0.5",
                      isToday
                        ? "border-amber-300/30 bg-amber-400/10"
                        : hasPassed
                          ? "border-white/10 bg-white/[0.03] opacity-70"
                          : "border-white/10 bg-white/5 hover:bg-white/10",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p
                          className={[
                            "text-xl font-bold",
                            isToday
                              ? "text-amber-300"
                              : hasPassed
                                ? "text-slate-400"
                                : "text-blue-300",
                          ].join(" ")}
                        >
                          {formatCountdown(
                            countdownEvent.title,
                            daysRemaining
                          )}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          void removeEvent(
                            countdownEvent.id
                          )
                        }
                        disabled={
                          deletingId !== null
                        }
                        aria-label={`Ta bort ${countdownEvent.title}`}
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
                          countdownEvent.event_date
                        )}
                      </span>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Nedräkningarna sparas i familjens
        molndatabas och synkas mellan enheter.
      </p>
    </Card>
  );
}