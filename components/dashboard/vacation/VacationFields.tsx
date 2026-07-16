import {
  VacationField,
  VacationFieldsForm,
} from "@/components/dashboard/vacation/vacation-types";

type VacationFieldsProps = {
  form: VacationFieldsForm;
  onChange: (
    field: VacationField,
    value: string
  ) => void;
  accent?: "blue" | "emerald";
};

export default function VacationFields({
  form,
  onChange,
  accent = "blue",
}: VacationFieldsProps) {
  const focusClasses =
    accent === "emerald"
      ? "focus:border-emerald-400 focus:ring-emerald-400/20"
      : "focus:border-blue-400 focus:ring-blue-400/20";

  const inputClasses = [
    "w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3",
    "text-white outline-none transition placeholder:text-slate-500",
    "focus:ring-2",
    focusClasses,
  ].join(" ");

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
          className={inputClasses}
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
          className={inputClasses}
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
          className={`${inputClasses} resize-y`}
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
          className={`${inputClasses} resize-y`}
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
          className={`${inputClasses} resize-y`}
        />
      </label>
    </div>
  );
}