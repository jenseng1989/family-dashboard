import { Calendar } from "lucide-react";
import Card from "@/components/ui/Card";
import { formatEventTime, getCalendarEvents } from "@/lib/calendar";

export default async function CalendarWidget() {
  const events = await getCalendarEvents();

  return (
    <Card title="Kalender" icon={<Calendar size={28} />}>
      {events.length === 0 ? (
        <div>
          <p className="font-medium text-slate-900 dark:text-white">
            Inga kommande händelser
          </p>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Kalendern är ansluten, men inga händelser hittades.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
            >
              <p className="font-semibold text-slate-900 dark:text-white">
                {event.title}
              </p>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                {formatEventTime(event.startTime)}–{formatEventTime(event.endTime)}
                {event.location ? ` · ${event.location}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}