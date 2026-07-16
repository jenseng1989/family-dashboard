"use client";

import {
  BedDouble,
  CalendarDays,
  Check,
  ExternalLink,
  Info,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Route,
  Sparkles,
  Umbrella,
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

type VacationDay = {
  id: string;
  plan_date: string;
  day_name: string | null;
  location: string | null;
  travel: string | null;
  accommodation: string | null;
  activity: string | null;
  information: string | null;
};

type VacationForm = {
  planDate: string;
  location: string;
  travel: string;
  accommodation: string;
  activity: string;
  information: string;
};

type VacationEditForm = Omit<VacationForm, "planDate">;

const EMPTY_ADD_FORM: VacationForm = {
  planDate: "",
  location: "",
  travel: "",
  accommodation: "",
  activity: "",
  information: "",
};

function getTodayString(): string {
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
    }
  );
}

function formatShortDate(dateString: string): string {
  return parseLocalDate(dateString).toLocaleDateString(
    "sv-SE",
    {
      day: "numeric",
      month: "short",
    }
  );
}

function getSwedishDayName(dateString: string): string {
  return parseLocalDate(dateString).toLocaleDateString(
    "sv-SE",
    {
      weekday: "long",
    }
  );
}

function createMapsUrl(
  accommodation: string,
  location: string | null
): string {
  const query = location
    ? `${accommodation}, ${location}`
    : accommodation;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;
}

function hasVisibleInformation(day: VacationDay): boolean {
  return Boolean(
    day.location ||
      day.travel ||
      day.accommodation ||
      day.activity ||
      day.information
  );
}

function normalizeOptionalText(
  value: string
): string | null {
  const trimmedValue = value.trim();

  return trimmedValue || null;
}

function createEditForm(
  day: VacationDay
): VacationEditForm {
  return {
    location: day.location ?? "",
    travel: day.travel ?? "",
    accommodation: day.accommodation ?? "",
    activity: day.activity ?? "",
    information: day.information ?? "",
  };
}

function formHasInformation(
  form: VacationForm | VacationEditForm
): boolean {
  return Boolean(
    form.location.trim() ||
      form.travel.trim() ||
      form.accommodation.trim() ||
      form.activity.trim() ||
      form.information.trim()
  );
}

type VacationFieldsProps = {
  form: VacationForm | VacationEditForm;
  onChange: (
    field:
      | keyof VacationForm
      | keyof VacationEditForm,
    value: string
  ) => void;
};

function VacationFields({
  form,
  onChange,
}: VacationFieldsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-300">
          Plats
        </span>

        <input
          type="text"
          value={form.location}
          onChange={(event) =>
            onChange("location", event.target.value)
          }
          placeholder="Till exempel Ystad"
          maxLength={150}
          className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-300">
          Boende
        </span>

        <input
          type="text"
          value={form.accommodation}
          onChange={(event) =>
            onChange(
              "accommodation",
              event.target.value
            )
          }
          placeholder="Hotell eller boende"
          maxLength={200}
          className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
        />
      </label>

      <label className="block md:col-span-2">
        <span className="mb-2 block text-sm font-medium text-slate-300">
          Aktivitet
        </span>

        <textarea
          value={form.activity}
          onChange={(event) =>
            onChange("activity", event.target.value)
          }
          placeholder="Dagens aktivitet"
          rows={3}
          maxLength={1000}
          className="w-full resize-y rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
        />
      </label>

      <label className="block md:col-span-2">
        <span className="mb-2 block text-sm font-medium text-slate-300">
          Resa
        </span>

        <textarea
          value={form.travel}
          onChange={(event) =>
            onChange("travel", event.target.value)
          }
          placeholder="Tåg, bilresa eller annan transport"
          rows={3}
          maxLength={1500}
          className="w-full resize-y rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
        />
      </label>

      <label className="block md:col-span-2">
        <span className="mb-2 block text-sm font-medium text-slate-300">
          Information
        </span>

        <textarea
          value={form.information}
          onChange={(event) =>
            onChange(
              "information",
              event.target.value
            )
          }
          placeholder="Bokningstider eller annan information"
          rows={3}
          maxLength={1500}
          className="w-full resize-y rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
        />
      </label>
    </div>
  );
}

type EditVacationDayProps = {
  day: VacationDay;
  form: VacationEditForm;
  isSaving: boolean;
  onChange: (
    field: keyof VacationEditForm,
    value: string
  ) => void;
  onCancel: () => void;
  onSubmit: (
    event: FormEvent<HTMLFormElement>
  ) => void;
};

function EditVacationDay({
  day,
  form,
  isSaving,
  onChange,
  onCancel,
  onSubmit,
}: EditVacationDayProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-blue-300/20 bg-blue-400/10 p-4"
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-300">
            Redigera dag
          </p>

          <h3 className="mt-1 text-xl font-bold capitalize text-white">
            {formatDate(day.plan_date)}
          </h3>
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          <X size={17} />
          Avbryt
        </button>
      </div>

      <VacationFields
        form={form}
        onChange={onChange}
      />

      <button
        type="submit"
        disabled={
          isSaving || !formHasInformation(form)
        }
        className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {isSaving ? (
          <LoaderCircle
            size={19}
            className="animate-spin"
          />
        ) : (
          <Check size={19} />
        )}

        {isSaving
          ? "Sparar…"
          : "Spara ändringar"}
      </button>
    </form>
  );
}

export default function VacationPlan() {
  const [days, setDays] = useState<VacationDay[]>(
    []
  );
  const [isLoading, setIsLoading] =
    useState(true);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [isAdding, setIsAdding] =
    useState(false);
  const [addForm, setAddForm] =
    useState<VacationForm>(EMPTY_ADD_FORM);
  const [isAddingDay, setIsAddingDay] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);
  const [editForm, setEditForm] =
    useState<VacationEditForm | null>(null);
  const [isSaving, setIsSaving] =
    useState(false);

  const loadPlan = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("vacation_plan")
      .select(
        "id, plan_date, day_name, location, travel, accommodation, activity, information"
      )
      .order("plan_date", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Kunde inte hämta semesterplaneringen:",
        error
      );

      setErrorMessage(
        "Kunde inte hämta semesterplaneringen."
      );
      setIsLoading(false);
      return;
    }

    setDays(
      (data ?? []).filter(hasVisibleInformation)
    );
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  const today = getTodayString();

  const {
    featuredDay,
    remainingDays,
    featuredLabel,
  } = useMemo(() => {
    const todaysDay = days.find(
      (day) => day.plan_date === today
    );

    if (todaysDay) {
      return {
        featuredDay: todaysDay,
        remainingDays: days.filter(
          (day) => day.plan_date > today
        ),
        featuredLabel: "Dagens plan",
      };
    }

    const nextDay = days.find(
      (day) => day.plan_date > today
    );

    if (nextDay) {
      return {
        featuredDay: nextDay,
        remainingDays: days.filter(
          (day) =>
            day.plan_date > nextDay.plan_date
        ),
        featuredLabel:
          "Nästa planerade dag",
      };
    }

    return {
      featuredDay: null,
      remainingDays: [],
      featuredLabel: "Semesterplanering",
    };
  }, [days, today]);

  function updateAddField(
    field: keyof VacationForm,
    value: string
  ) {
    setAddForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function closeAddForm() {
    if (isAddingDay) {
      return;
    }

    setIsAdding(false);
    setAddForm(EMPTY_ADD_FORM);
    setErrorMessage(null);
  }

  async function addVacationDay(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !addForm.planDate ||
      !formHasInformation(addForm) ||
      isAddingDay
    ) {
      setErrorMessage(
        "Välj ett datum och fyll i minst ett informationsfält."
      );
      return;
    }

    setIsAddingDay(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("vacation_plan")
      .insert({
        plan_date: addForm.planDate,
        day_name: getSwedishDayName(
          addForm.planDate
        ),
        location: normalizeOptionalText(
          addForm.location
        ),
        travel: normalizeOptionalText(
          addForm.travel
        ),
        accommodation: normalizeOptionalText(
          addForm.accommodation
        ),
        activity: normalizeOptionalText(
          addForm.activity
        ),
        information: normalizeOptionalText(
          addForm.information
        ),
      })
      .select(
        "id, plan_date, day_name, location, travel, accommodation, activity, information"
      )
      .single();

    if (error) {
      console.error(
        "Kunde inte lägga till semesterdagen:",
        error
      );

      if (error.code === "23505") {
        setErrorMessage(
          "Det finns redan en planerad dag med det valda datumet. Redigera den befintliga dagen i stället."
        );
      } else {
        setErrorMessage(
          "Den nya semesterdagen kunde inte sparas."
        );
      }

      setIsAddingDay(false);
      return;
    }

    setDays((currentDays) =>
      [...currentDays, data].sort(
        (firstDay, secondDay) =>
          parseLocalDate(
            firstDay.plan_date
          ).getTime() -
          parseLocalDate(
            secondDay.plan_date
          ).getTime()
      )
    );

    setAddForm(EMPTY_ADD_FORM);
    setIsAdding(false);
    setIsAddingDay(false);
  }

  function startEditing(day: VacationDay) {
    setIsAdding(false);
    setEditingId(day.id);
    setEditForm(createEditForm(day));
    setErrorMessage(null);
  }

  function cancelEditing() {
    if (isSaving) {
      return;
    }

    setEditingId(null);
    setEditForm(null);
  }

  function updateEditField(
    field: keyof VacationEditForm,
    value: string
  ) {
    setEditForm((currentForm) => {
      if (!currentForm) {
        return currentForm;
      }

      return {
        ...currentForm,
        [field]: value,
      };
    });
  }

  async function saveChanges(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !editingId ||
      !editForm ||
      isSaving
    ) {
      return;
    }

    if (!formHasInformation(editForm)) {
      setErrorMessage(
        "Fyll i minst ett informationsfält."
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("vacation_plan")
      .update({
        location: normalizeOptionalText(
          editForm.location
        ),
        travel: normalizeOptionalText(
          editForm.travel
        ),
        accommodation: normalizeOptionalText(
          editForm.accommodation
        ),
        activity: normalizeOptionalText(
          editForm.activity
        ),
        information: normalizeOptionalText(
          editForm.information
        ),
      })
      .eq("id", editingId)
      .select(
        "id, plan_date, day_name, location, travel, accommodation, activity, information"
      )
      .single();

    if (error) {
      console.error(
        "Kunde inte uppdatera semesterplaneringen:",
        error
      );

      setErrorMessage(
        "Ändringarna kunde inte sparas."
      );
      setIsSaving(false);
      return;
    }

    setDays((currentDays) =>
      currentDays
        .map((day) =>
          day.id === data.id ? data : day
        )
        .filter(hasVisibleInformation)
    );

    setEditingId(null);
    setEditForm(null);
    setIsSaving(false);
  }

  if (isLoading) {
    return (
      <Card
        title="Semesterplanering"
        icon={<Umbrella size={28} />}
      >
        <div className="flex min-h-52 flex-col items-center justify-center gap-3">
          <LoaderCircle
            size={32}
            className="animate-spin text-blue-300"
          />

          <p className="text-sm text-slate-400">
            Hämtar semesterplaneringen…
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Semesterplanering"
      icon={<Umbrella size={28} />}
    >
      <div className="mb-5 flex justify-end">
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setEditForm(null);
            setIsAdding((current) => !current);
            setErrorMessage(null);
          }}
          disabled={isAddingDay || isSaving}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-wait disabled:opacity-50"
        >
          {isAdding ? (
            <X size={18} />
          ) : (
            <Plus size={18} />
          )}

          {isAdding
            ? "Stäng formulär"
            : "Lägg till dag"}
        </button>
      </div>

      {isAdding && (
        <form
          onSubmit={addVacationDay}
          className="mb-5 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4 sm:p-5"
        >
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-300">
                Ny semesterdag
              </p>

              <h3 className="mt-1 text-xl font-bold text-white">
                Lägg till en dag i planeringen
              </h3>
            </div>

            <label className="block w-full sm:w-56">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                Datum
              </span>

              <input
                type="date"
                value={addForm.planDate}
                onChange={(event) =>
                  updateAddField(
                    "planDate",
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
              />
            </label>
          </div>

          <VacationFields
            form={addForm}
            onChange={updateAddField}
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={
                !addForm.planDate ||
                !formHasInformation(addForm) ||
                isAddingDay
              }
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isAddingDay ? (
                <LoaderCircle
                  size={19}
                  className="animate-spin"
                />
              ) : (
                <Plus size={19} />
              )}

              {isAddingDay
                ? "Lägger till…"
                : "Lägg till dagen"}
            </button>

            <button
              type="button"
              onClick={closeAddForm}
              disabled={isAddingDay}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              <X size={19} />
              Avbryt
            </button>
          </div>
        </form>
      )}

      {errorMessage && (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-red-200">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() => void loadPlan()}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-300/20 bg-red-300/10 px-3 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-300/20"
          >
            <RefreshCw size={16} />
            Hämta igen
          </button>
        </div>
      )}

      {featuredDay ? (
        editingId === featuredDay.id &&
        editForm ? (
          <EditVacationDay
            day={featuredDay}
            form={editForm}
            isSaving={isSaving}
            onChange={updateEditField}
            onCancel={cancelEditing}
            onSubmit={saveChanges}
          />
        ) : (
          <section className="rounded-2xl border border-blue-300/20 bg-blue-400/10 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
                  {featuredLabel}
                </p>

                <h3 className="mt-1 text-2xl font-bold capitalize text-white">
                  {formatDate(
                    featuredDay.plan_date
                  )}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    startEditing(featuredDay)
                  }
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
                >
                  <Pencil size={16} />
                  Redigera
                </button>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
                  <Sparkles size={24} />
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {featuredDay.location && (
                <div className="rounded-xl bg-slate-950/25 p-4">
                  <p className="flex items-center gap-2 text-sm text-slate-400">
                    <MapPin size={16} />
                    Plats
                  </p>

                  <p className="mt-2 font-semibold text-white">
                    {featuredDay.location}
                  </p>
                </div>
              )}

              {featuredDay.accommodation && (
                <div className="rounded-xl bg-slate-950/25 p-4">
                  <p className="flex items-center gap-2 text-sm text-slate-400">
                    <BedDouble size={16} />
                    Boende
                  </p>

                  <a
                    href={createMapsUrl(
                      featuredDay.accommodation,
                      featuredDay.location
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 font-semibold text-blue-300 transition hover:text-blue-200"
                  >
                    {featuredDay.accommodation}
                    <ExternalLink size={15} />
                  </a>
                </div>
              )}

              {featuredDay.activity && (
                <div className="rounded-xl bg-slate-950/25 p-4">
                  <p className="flex items-center gap-2 text-sm text-slate-400">
                    <CalendarDays size={16} />
                    Aktivitet
                  </p>

                  <p className="mt-2 whitespace-pre-line font-semibold text-white">
                    {featuredDay.activity}
                  </p>
                </div>
              )}

              {featuredDay.travel && (
                <div className="rounded-xl bg-slate-950/25 p-4">
                  <p className="flex items-center gap-2 text-sm text-slate-400">
                    <Route size={16} />
                    Resa
                  </p>

                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-white">
                    {featuredDay.travel}
                  </p>
                </div>
              )}
            </div>

            {featuredDay.information && (
              <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-400/10 p-4">
                <p className="flex items-start gap-2 whitespace-pre-line text-sm font-medium text-amber-200">
                  <Info
                    size={16}
                    className="mt-0.5 shrink-0"
                  />
                  {featuredDay.information}
                </p>
              </div>
            )}
          </section>
        )
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
          <Umbrella
            size={36}
            className="mx-auto text-blue-300"
          />

          <p className="mt-3 font-semibold text-white">
            Inga kommande planerade dagar
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Tryck på Lägg till dag för att fortsätta
            semesterplaneringen.
          </p>
        </div>
      )}

      {remainingDays.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
            Resterande dagar
          </h3>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="bg-white/10 text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    Datum
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Plats
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Boende
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Aktivitet
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Resa
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Information
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Ändra
                  </th>
                </tr>
              </thead>

              <tbody>
                {remainingDays.map((day) => (
                  <tr
                    key={day.id}
                    className="border-t border-white/10 align-top transition hover:bg-white/5"
                  >
                    {editingId === day.id &&
                    editForm ? (
                      <td
                        colSpan={7}
                        className="p-4"
                      >
                        <EditVacationDay
                          day={day}
                          form={editForm}
                          isSaving={isSaving}
                          onChange={updateEditField}
                          onCancel={cancelEditing}
                          onSubmit={saveChanges}
                        />
                      </td>
                    ) : (
                      <>
                        <td className="whitespace-nowrap px-4 py-3">
                          <p className="font-semibold capitalize text-white">
                            {day.day_name ?? ""}
                          </p>

                          <p className="mt-1 text-slate-400">
                            {formatShortDate(
                              day.plan_date
                            )}
                          </p>
                        </td>

                        <td className="px-4 py-3 text-slate-300">
                          {day.location || "–"}
                        </td>

                        <td className="px-4 py-3">
                          {day.accommodation ? (
                            <a
                              href={createMapsUrl(
                                day.accommodation,
                                day.location
                              )}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 font-medium text-blue-300 transition hover:text-blue-200"
                            >
                              {day.accommodation}
                              <ExternalLink
                                size={14}
                              />
                            </a>
                          ) : (
                            <span className="text-slate-500">
                              –
                            </span>
                          )}
                        </td>

                        <td className="max-w-xs whitespace-pre-line px-4 py-3 text-slate-300">
                          {day.activity || "–"}
                        </td>

                        <td className="max-w-xs whitespace-pre-line px-4 py-3 text-slate-300">
                          {day.travel || "–"}
                        </td>

                        <td className="max-w-xs whitespace-pre-line px-4 py-3 text-slate-300">
                          {day.information || "–"}
                        </td>

                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              startEditing(day)
                            }
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
                            aria-label={`Redigera ${formatDate(
                              day.plan_date
                            )}`}
                          >
                            <Pencil size={17} />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </Card>
  );
}