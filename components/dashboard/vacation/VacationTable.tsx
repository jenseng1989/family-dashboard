import {
  ExternalLink,
  Pencil,
} from "lucide-react";
import VacationEditForm from "@/components/dashboard/vacation/VacationEditForm";
import {
  VacationDay,
  VacationField,
  VacationFieldsForm,
} from "@/components/dashboard/vacation/vacation-types";
import {
  createMapsUrl,
  formatShortVacationDate,
  formatVacationDate,
} from "@/components/dashboard/vacation/vacation-utils";
import { FormEvent } from "react";

type VacationTableProps = {
  days: VacationDay[];
  editingId: string | null;
  editForm: VacationFieldsForm | null;
  isSaving: boolean;
  onStartEditing: (day: VacationDay) => void;
  onEditFieldChange: (
    field: VacationField,
    value: string
  ) => void;
  onCancelEditing: () => void;
  onSaveChanges: (
    event: FormEvent<HTMLFormElement>
  ) => void;
};

export default function VacationTable({
  days,
  editingId,
  editForm,
  isSaving,
  onStartEditing,
  onEditFieldChange,
  onCancelEditing,
  onSaveChanges,
}: VacationTableProps) {
  if (days.length === 0) {
    return null;
  }

  return (
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
            {days.map((day) => {
              const isEditing =
                editingId === day.id && editForm;

              return (
                <tr
                  key={day.id}
                  className="border-t border-white/10 align-top transition hover:bg-white/5"
                >
                  {isEditing ? (
                    <td
                      colSpan={7}
                      className="p-4"
                    >
                      <VacationEditForm
                        day={day}
                        form={editForm}
                        isSaving={isSaving}
                        onChange={onEditFieldChange}
                        onCancel={onCancelEditing}
                        onSubmit={onSaveChanges}
                      />
                    </td>
                  ) : (
                    <>
                      <td className="whitespace-nowrap px-4 py-3">
                        <p className="font-semibold capitalize text-white">
                          {day.day_name ?? ""}
                        </p>

                        <p className="mt-1 text-slate-400">
                          {formatShortVacationDate(
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
                            <ExternalLink size={14} />
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
                            onStartEditing(day)
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
                          aria-label={`Redigera ${formatVacationDate(
                            day.plan_date
                          )}`}
                        >
                          <Pencil size={17} />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}