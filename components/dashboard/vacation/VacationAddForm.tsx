import {
  FormEvent,
} from "react";
import {
  LoaderCircle,
  Plus,
  X,
} from "lucide-react";
import VacationFields from "@/components/dashboard/vacation/VacationFields";
import {
  VacationAddFormData,
  VacationField,
} from "@/components/dashboard/vacation/vacation-types";
import {
  formHasVacationInformation,
} from "@/components/dashboard/vacation/vacation-utils";

type VacationAddFormProps = {
  form: VacationAddFormData;
  isSaving: boolean;
  onFieldChange: (
    field: VacationField,
    value: string
  ) => void;
  onDateChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: (
    event: FormEvent<HTMLFormElement>
  ) => void;
};

export default function VacationAddForm({
  form,
  isSaving,
  onFieldChange,
  onDateChange,
  onCancel,
  onSubmit,
}: VacationAddFormProps) {
  const canSubmit =
    Boolean(form.planDate) &&
    formHasVacationInformation(form);

  return (
    <form
      onSubmit={onSubmit}
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
            value={form.planDate}
            onChange={(event) =>
              onDateChange(event.target.value)
            }
            className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
          />
        </label>
      </div>

      <VacationFields
        form={form}
        onChange={onFieldChange}
        accent="emerald"
      />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={!canSubmit || isSaving}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
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
            ? "Lägger till…"
            : "Lägg till dagen"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          <X size={19} />
          Avbryt
        </button>
      </div>
    </form>
  );
}