"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  LoaderCircle,
  Plus,
  RefreshCw,
  Umbrella,
  X,
} from "lucide-react";
import Card from "@/components/ui/Card";
import VacationAddForm from "@/components/dashboard/vacation/VacationAddForm";
import VacationEditForm from "@/components/dashboard/vacation/VacationEditForm";
import VacationFeaturedDay from "@/components/dashboard/vacation/VacationFeaturedDay";
import VacationTable from "@/components/dashboard/vacation/VacationTable";
import {
  EMPTY_VACATION_ADD_FORM,
  EMPTY_VACATION_FIELDS_FORM,
  VacationAddFormData,
  VacationDay,
  VacationField,
  VacationFieldsForm,
} from "@/components/dashboard/vacation/vacation-types";
import {
  createVacationEditForm,
  formHasVacationInformation,
  getSwedishDayName,
  getTodayString,
  hasVisibleVacationInformation,
  normalizeOptionalText,
  parseLocalDate,
} from "@/components/dashboard/vacation/vacation-utils";
import { supabase } from "@/lib/supabase";

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
    useState<VacationAddFormData>(
      EMPTY_VACATION_ADD_FORM
    );
  const [isAddingDay, setIsAddingDay] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);
  const [editForm, setEditForm] =
    useState<VacationFieldsForm | null>(null);
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
      ((data ?? []) as VacationDay[]).filter(
        hasVisibleVacationInformation
      )
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
    field: VacationField,
    value: string
  ) {
    setAddForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function updateAddDate(value: string) {
    setAddForm((currentForm) => ({
      ...currentForm,
      planDate: value,
    }));
  }

  function closeAddForm() {
    if (isAddingDay) {
      return;
    }

    setIsAdding(false);
    setAddForm(EMPTY_VACATION_ADD_FORM);
    setErrorMessage(null);
  }

  async function addVacationDay(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !addForm.planDate ||
      !formHasVacationInformation(addForm) ||
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

    const newDay = data as VacationDay;

    setDays((currentDays) =>
      [...currentDays, newDay].sort(
        (firstDay, secondDay) =>
          parseLocalDate(
            firstDay.plan_date
          ).getTime() -
          parseLocalDate(
            secondDay.plan_date
          ).getTime()
      )
    );

    setAddForm(EMPTY_VACATION_ADD_FORM);
    setIsAdding(false);
    setIsAddingDay(false);
  }

  function startEditing(day: VacationDay) {
    setIsAdding(false);
    setEditingId(day.id);
    setEditForm(createVacationEditForm(day));
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
    field: VacationField,
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

    if (!formHasVacationInformation(editForm)) {
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

    const updatedDay = data as VacationDay;

    setDays((currentDays) =>
      currentDays
        .map((day) =>
          day.id === updatedDay.id
            ? updatedDay
            : day
        )
        .filter(hasVisibleVacationInformation)
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
        <VacationAddForm
          form={addForm}
          isSaving={isAddingDay}
          onFieldChange={updateAddField}
          onDateChange={updateAddDate}
          onCancel={closeAddForm}
          onSubmit={addVacationDay}
        />
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
          <VacationEditForm
            day={featuredDay}
            form={editForm}
            isSaving={isSaving}
            onChange={updateEditField}
            onCancel={cancelEditing}
            onSubmit={saveChanges}
          />
        ) : (
          <VacationFeaturedDay
            day={featuredDay}
            label={featuredLabel}
            onEdit={() =>
              startEditing(featuredDay)
            }
          />
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

      <VacationTable
        days={remainingDays}
        editingId={editingId}
        editForm={editForm}
        isSaving={isSaving}
        onStartEditing={startEditing}
        onEditFieldChange={updateEditField}
        onCancelEditing={cancelEditing}
        onSaveChanges={saveChanges}
      />
    </Card>
  );
}