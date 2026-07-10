import {
  CalendarDays,
  Cake,
  PartyPopper,
  Sparkles,
} from "lucide-react";

import Card from "@/components/ui/Card";
import {
  AccentColor,
  FamilyEvent,
  FamilyName,
  FamilyTimelineItem,
  formatFamilyDate,
  formatShortFamilyDate,
  getCountdownText,
  getFamilyTimeline,
  getUpcomingFamilyEvents,
} from "@/lib/family";

type AccentStyle = {
  border: string;
  background: string;
  iconBackground: string;
  progress: string;
  badge: string;
  nameBadge: string;
  eventText: string;
};

function getAccentStyle(accent: AccentColor): AccentStyle {
  const styles: Record<AccentColor, AccentStyle> = {
    blue: {
      border: "border-blue-400/20",
      background:
        "bg-gradient-to-br from-blue-500/10 to-cyan-500/5",
      iconBackground: "bg-blue-400/15",
      progress:
        "bg-gradient-to-r from-blue-400 to-cyan-300",
      badge: "bg-blue-500/15 text-blue-200",
      nameBadge:
        "border-blue-300/30 bg-blue-400/15 text-blue-100",
      eventText: "text-blue-200",
    },
    rose: {
      border: "border-rose-400/20",
      background:
        "bg-gradient-to-br from-rose-500/10 to-pink-500/5",
      iconBackground: "bg-rose-400/15",
      progress:
        "bg-gradient-to-r from-rose-400 to-pink-300",
      badge: "bg-rose-500/15 text-rose-200",
      nameBadge:
        "border-rose-300/30 bg-rose-400/15 text-rose-100",
      eventText: "text-rose-200",
    },
    amber: {
      border: "border-amber-400/20",
      background:
        "bg-gradient-to-br from-amber-500/10 to-orange-500/5",
      iconBackground: "bg-amber-400/15",
      progress:
        "bg-gradient-to-r from-amber-300 to-orange-300",
      badge: "bg-amber-500/15 text-amber-200",
      nameBadge:
        "border-amber-300/30 bg-amber-400/15 text-amber-100",
      eventText: "text-amber-200",
    },
  };

  return styles[accent];
}

function getEventHighlight(event: FamilyEvent): string {
  if (event.daysUntil === 0) {
    return "border-amber-300/40 bg-amber-400/15";
  }

  if (event.daysUntil <= 7) {
    return "border-rose-300/30 bg-rose-400/10";
  }

  if (event.daysUntil <= 30) {
    return "border-amber-300/25 bg-amber-400/10";
  }

  return "border-white/10 bg-white/5";
}

function NameBadge({
  personName,
  accent,
}: {
  personName: FamilyName;
  accent: AccentColor;
}) {
  const style = getAccentStyle(accent);
  const hasNameDay = Boolean(personName.nameDay);

  if (!hasNameDay || !personName.nameDay) {
    return (
      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-400">
        {personName.name}
      </span>
    );
  }

  return (
    <span
      className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${style.nameBadge}`}
      title={`${personName.name} har namnsdag ${formatShortFamilyDate(
        personName.nameDay.month,
        personName.nameDay.day
      )}`}
    >
      ✨ {personName.name}
      <span className="ml-1.5 text-xs font-normal opacity-75">
        {formatShortFamilyDate(
          personName.nameDay.month,
          personName.nameDay.day
        )}
      </span>
    </span>
  );
}

function PersonCard({
  person,
}: {
  person: FamilyTimelineItem;
}) {
  const style = getAccentStyle(person.accent);

  return (
    <article
      className={`rounded-3xl border p-5 transition duration-300 hover:-translate-y-1 hover:bg-white/[0.08] ${style.border} ${style.background}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${style.iconBackground}`}
          >
            {person.emoji}
          </div>

          <div>
            <h3 className="text-xl font-bold text-white">
              {person.displayName}
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              Familjemedlem
            </p>
          </div>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${style.badge}`}
        >
          {Math.round(person.yearProgress)} %
        </span>
      </div>

      {/* För- och mellannamn */}
      <div className="mt-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
          Namn
        </p>

        <div className="flex flex-wrap gap-2">
          {person.names.map((personName) => (
            <NameBadge
              key={personName.name}
              personName={personName}
              accent={person.accent}
            />
          ))}
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Markerade namn har namnsdag i almanackan.
        </p>
      </div>

      {/* Aktuell ålder */}
      <div className="mt-6">
        <p className="text-sm text-slate-400">
          Aktuell ålder
        </p>

        <p className="mt-1 text-3xl font-bold text-white">
          {person.ageYears} år
        </p>

        <p className="mt-1 text-lg text-slate-300">
          och {person.ageDaysAfterBirthday} dagar
        </p>
      </div>

      {/* Progression till nästa födelsedag */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between gap-4">
          <p className="text-sm text-slate-400">
            Mot {person.nextAge} år
          </p>

          <p className="text-sm font-medium text-white">
            {getCountdownText(person.daysUntilBirthday)}
          </p>
        </div>

        <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${style.progress}`}
            style={{
              width: `${person.yearProgress}%`,
            }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>{person.ageYears} år</span>
          <span>{person.nextAge} år</span>
        </div>
      </div>

      {/* Nästa födelsedag */}
      <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-4">
        <div className="flex items-center gap-2 text-slate-300">
          <CalendarDays size={17} />
          <p className="text-sm">Nästa födelsedag</p>
        </div>

        <p className="mt-2 text-lg font-semibold capitalize text-white">
          {formatFamilyDate(person.nextBirthday)}
        </p>

        <p className="mt-1 text-sm text-slate-400">
          Fyller {person.nextAge} år
        </p>
      </div>
    </article>
  );
}

function EventTitle({
  event,
}: {
  event: FamilyEvent;
}) {
  const style = getAccentStyle(event.accent);

  if (event.type === "birthday") {
    return (
      <p className="font-semibold text-white">
        🎂 {event.title}
      </p>
    );
  }

  return (
    <p className="font-semibold text-white">
      🌼{" "}
      <span
        className={`rounded-md bg-white/10 px-1.5 py-0.5 ${style.eventText}`}
      >
        {event.eventName}
      </span>{" "}
      har namnsdag
      <span className="ml-1 text-sm font-normal text-slate-400">
        ({event.displayName})
      </span>
    </p>
  );
}

export default function FamilyTimelineWidget() {
  const timeline = getFamilyTimeline();
  const events = getUpcomingFamilyEvents();
  const nextEvent = events[0];

  return (
    <Card
      title="Family Timeline"
      icon={<Cake size={28} />}
      className="md:col-span-2 xl:col-span-3"
    >
      {/* Nästa familjehändelse */}
      {nextEvent && (
        <div className="mb-6 rounded-3xl border border-violet-300/20 bg-gradient-to-r from-violet-500/15 via-blue-500/10 to-cyan-500/10 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-violet-400/15 p-3 text-violet-200">
                <PartyPopper size={28} />
              </div>

              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-violet-200">
                  Nästa familjehändelse
                </p>

                <div className="mt-1 text-xl font-bold">
                  <EventTitle event={nextEvent} />
                </div>

                <p className="mt-1 capitalize text-sm text-slate-300">
                  {formatFamilyDate(nextEvent.date)}
                </p>
              </div>
            </div>

            <div className="w-fit rounded-2xl border border-white/10 bg-black/10 px-5 py-3 text-center">
              <p className="text-3xl font-bold text-white">
                {nextEvent.daysUntil}
              </p>

              <p className="text-xs uppercase tracking-wider text-slate-300">
                dagar kvar
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Familjemedlemmarna */}
      <div className="grid gap-4 lg:grid-cols-3">
        {timeline.map((person) => (
          <PersonCard
            key={person.id}
            person={person}
          />
        ))}
      </div>

      {/* Kommande händelser */}
      <div className="mt-7">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-violet-400/15 p-2 text-violet-200">
            <Sparkles size={20} />
          </div>

          <div>
            <h3 className="font-semibold text-white">
              Kommande familjehändelser
            </h3>

            <p className="text-sm text-slate-400">
              Födelsedagar och namnsdagar i datumordning
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {events.map((event) => (
            <div
              key={event.id}
              className={`rounded-2xl border p-4 ${getEventHighlight(
                event
              )}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl">
                    {event.emoji}
                  </div>

                  <div>
                    <EventTitle event={event} />

                    <p className="mt-1 capitalize text-sm text-slate-400">
                      {formatFamilyDate(event.date)}
                    </p>
                  </div>
                </div>

                <div className="w-fit rounded-xl bg-white/10 px-4 py-2 text-center">
                  <p className="font-bold text-white">
                    {getCountdownText(event.daysUntil)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}