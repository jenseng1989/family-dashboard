import { FormEvent } from "react";
import {
  Check,
  LoaderCircle,
  X,
} from "lucide-react";
import VacationFields from "@/components/dashboard/vacation/VacationFields";
import {
  VacationDay,
  VacationField,
  VacationFieldsForm,
} from "@/components/dashboard/vacation/vacation-types";
import {
  formatVacationDate,
  formHasVacationInformation,
} from "@/components/dashboard/vacation/vacation-utils";

type VacationEditFormProps = {
  day: VacationDay;
  form: VacationFieldsForm;
  isSaving: boolean;
  onChange: (
    field: VacationField,
    value: string
  ) => void;
  onCancel: () => void;
  onSubmit: (
    event: FormEvent<HTMLFormElement>
  ) => void;
};

export default function VacationEditForm({
  day,
  form,
  isSaving,
  onChange,
  onCancel,
  onSubmit,
}: VacationEditFormProps) {
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
            {formatVacationDate(day.plan_date)}
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
          isSaving ||
          !formHasVacationInformation(form)
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