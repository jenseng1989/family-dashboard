"use client";

import {
  CalendarRange,
  ExternalLink,
  Gift,
  MapPin,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Card from "@/components/ui/Card";
import {
  getGothenburgEvents,
  type GothenburgEventsResponse,
} from "@/lib/gothenburg-events-client";

function formatDay(date: string, index: number) {
  if (index === 0) {
    return "Imorgon";
  }

  return new Date(`${date}T12:00:00`)
    .toLocaleDateString("sv-SE", {
      weekday: "long",
    })
    .replace(/^./, (value) =>
      value.toLocaleUpperCase("sv-SE")
    );
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(
    "sv-SE",
    {
      day: "numeric",
      month: "short",
    }
  );
}

export default function GothenburgEventsWidget() {
  const [data, setData] =
    useState<GothenburgEventsResponse | null>(null);
  const [isLoading, setIsLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  const loadData = useCallback(
    async (
      showLoader = true,
      forceRefresh = false
    ) => {
      if (showLoader) {
        setIsLoading(true);
      }

      setError(null);

      try {
        const result =
          await getGothenburgEvents(forceRefresh);

        setData(result);
      } catch (fetchError) {
        console.error(
          "Kunde inte hämta Göteborgsevenemang:",
          fetchError
        );

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Evenemangen kunde inte hämtas."
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadData();

    const intervalId = window.setInterval(
      () => void loadData(false),
      30 * 60 * 1000
    );

    return () => window.clearInterval(intervalId);
  }, [loadData]);

  return (
    <Card
      title="Evenemang · 7 dagar"
      icon={<CalendarRange size={28} />}
      storageKey="gothenburg-events"
      defaultMinimized={false}
    >
      {isLoading && !data ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3">
          <RefreshCw
            size={28}
            className="animate-spin text-blue-300"
          />
          <p className="text-sm text-slate-400">
            Hämtar kommande evenemang…
          </p>
        </div>
      ) : error && !data ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-5">
          <p className="font-semibold text-white">
            Evenemangen kunde inte hämtas
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void loadData(true, true)}
            className="mt-4 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Försök igen
          </button>
        </div>
      ) : data ? (
        <div className="space-y-3">
          {data.upcomingDays.map((day, dayIndex) => {
            const displayed = day.events.slice(0, 5);

            return (
              <section
                key={day.date}
                className="rounded-2xl border border-white/10 bg-slate-950/20 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-white">
                    {formatDay(day.date, dayIndex)}
                  </h3>

                  <span className="text-xs font-semibold text-slate-500">
                    {formatDate(day.date)}
                  </span>
                </div>

                {displayed.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">
                    Inga evenemang hittades.
                  </p>
                ) : (
                  <div className="mt-3 divide-y divide-white/[0.07]">
                    {displayed.map((event) => (
                      <a
                        key={event.id}
                        href={event.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold leading-5 text-white transition group-hover:text-blue-200">
                              {event.title}
                            </p>

                            {event.isFamily && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/15 bg-emerald-400/[0.07] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-emerald-300">
                                <UsersRound size={10} />
                                Familj
                              </span>
                            )}

                            {event.isFree && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/15 bg-amber-400/[0.07] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-amber-300">
                                <Gift size={10} />
                                Gratis
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                            {event.place && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin size={12} />
                                {event.place}
                              </span>
                            )}

                            {event.dateText && (
                              <span>{event.dateText}</span>
                            )}
                          </div>
                        </div>

                        <ExternalLink
                          size={15}
                          className="mt-1 shrink-0 text-slate-600 transition group-hover:text-blue-300"
                        />
                      </a>
                    ))}
                  </div>
                )}

                {day.events.length > displayed.length && (
                  <p className="mt-3 text-xs text-slate-500">
                    + {day.events.length - displayed.length} fler denna dag
                  </p>
                )}
              </section>
            );
          })}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-500">
            <span>
              Källa: goteborg.com
            </span>

            <a
              href={data.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-blue-300 transition hover:text-blue-200"
            >
              Öppna hela kalendern →
            </a>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
