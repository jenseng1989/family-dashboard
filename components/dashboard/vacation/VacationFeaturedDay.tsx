import {
  BedDouble,
  CalendarDays,
  ExternalLink,
  Info,
  MapPin,
  Pencil,
  Route,
  Sparkles,
} from "lucide-react";
import {
  VacationDay,
} from "@/components/dashboard/vacation/vacation-types";
import {
  createMapsUrl,
  formatVacationDate,
} from "@/components/dashboard/vacation/vacation-utils";

type VacationFeaturedDayProps = {
  day: VacationDay;
  label: string;
  onEdit: () => void;
};

export default function VacationFeaturedDay({
  day,
  label,
  onEdit,
}: VacationFeaturedDayProps) {
  return (
    <section className="rounded-2xl border border-blue-300/20 bg-blue-400/10 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
            {label}
          </p>

          <h3 className="mt-1 text-2xl font-bold capitalize text-white">
            {formatVacationDate(day.plan_date)}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
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
        {day.location && (
          <div className="rounded-xl bg-slate-950/25 p-4">
            <p className="flex items-center gap-2 text-sm text-slate-400">
              <MapPin size={16} />
              Plats
            </p>

            <p className="mt-2 font-semibold text-white">
              {day.location}
            </p>
          </div>
        )}

        {day.accommodation && (
          <div className="rounded-xl bg-slate-950/25 p-4">
            <p className="flex items-center gap-2 text-sm text-slate-400">
              <BedDouble size={16} />
              Boende
            </p>

            <a
              href={createMapsUrl(
                day.accommodation,
                day.location
              )}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-2 font-semibold text-blue-300 transition hover:text-blue-200"
            >
              {day.accommodation}
              <ExternalLink size={15} />
            </a>
          </div>
        )}

        {day.activity && (
          <div className="rounded-xl bg-slate-950/25 p-4">
            <p className="flex items-center gap-2 text-sm text-slate-400">
              <CalendarDays size={16} />
              Aktivitet
            </p>

            <p className="mt-2 whitespace-pre-line font-semibold text-white">
              {day.activity}
            </p>
          </div>
        )}

        {day.travel && (
          <div className="rounded-xl bg-slate-950/25 p-4">
            <p className="flex items-center gap-2 text-sm text-slate-400">
              <Route size={16} />
              Resa
            </p>

            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-white">
              {day.travel}
            </p>
          </div>
        )}
      </div>

      {day.information && (
        <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-400/10 p-4">
          <p className="flex items-start gap-2 whitespace-pre-line text-sm font-medium text-amber-200">
            <Info
              size={16}
              className="mt-0.5 shrink-0"
            />

            {day.information}
          </p>
        </div>
      )}
    </section>
  );
}