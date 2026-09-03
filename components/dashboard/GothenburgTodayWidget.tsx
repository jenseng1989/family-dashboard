"use client";

import {
  CalendarDays,
  ExternalLink,
  Gift,
  MapPin,
  RefreshCw,
  Sparkles,
  UsersRound,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Card from "@/components/ui/Card";
import {
  getGothenburgEvents,
  type GothenburgEventsResponse,
} from "@/lib/gothenburg-events-client";

function formatToday(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(
    "sv-SE",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
    }
  );
}

export default function GothenburgTodayWidget() {
  const [data, setData] =
    useState<GothenburgEventsResponse | null>(null);
  const [isLoading, setIsLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  const loadData = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const result =
        await getGothenburgEvents(forceRefresh);

      setData(result);
    } catch (fetchError) {
      console.error(
        "Kunde inte hämta Göteborg idag:",
        fetchError
      );

      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Göteborg idag kunde inte hämtas."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const highlighted = useMemo(() => {
    if (!data?.today) {
      return [];
    }

    return [...data.today.events]
      .sort((a, b) => {
        const scoreA =
          Number(a.isFamily) * 2 +
          Number(a.isFree);
        const scoreB =
          Number(b.isFamily) * 2 +
          Number(b.isFree);

        return (
          scoreB - scoreA ||
          a.title.localeCompare(b.title, "sv-SE")
        );
      })
      .slice(0, 3);
  }, [data]);

  return (
    <Card
      title="Göteborg idag"
      icon={<Sparkles size={28} />}
      storageKey="gothenburg-today"
      defaultMinimized={false}
    >
      {isLoading && !data ? (
        <div className="flex min-h-44 flex-col items-center justify-center gap-3">
          <RefreshCw
            size={27}
            className="animate-spin text-blue-300"
          />
          <p className="text-sm text-slate-400">
            Kollar vad som händer i Göteborg…
          </p>
        </div>
      ) : error && !data ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-5">
          <p className="font-semibold text-white">
            Göteborg idag kunde inte hämtas
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void loadData(true)}
            className="mt-4 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Försök igen
          </button>
        </div>
      ) : data?.today ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-300/15 bg-blue-500/[0.08] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">
                  {formatToday(data.today.date)}
                </p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {data.today.events.length === 1
                    ? "1 evenemang idag"
                    : `${data.today.events.length} evenemang idag`}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Utvalt från Göteborgs officiella evenemangskalender.
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-400/15 text-blue-200">
                <CalendarDays size={24} />
              </div>
            </div>
          </div>

          {highlighted.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-400">
              Inga evenemang hittades för idag.
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-3">
              {highlighted.map((event) => (
                <a
                  key={event.id}
                  href={event.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-2xl border border-white/10 bg-slate-950/25 p-4 transition hover:border-blue-300/25 hover:bg-blue-500/[0.07]"
                >
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-blue-300/20 bg-blue-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-200">
                      Idag
                    </span>

                    {event.isFamily && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/15 bg-emerald-400/[0.07] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-300">
                        <UsersRound size={11} />
                        Familj
                      </span>
                    )}

                    {event.isFree && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/15 bg-amber-400/[0.07] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-amber-300">
                        <Gift size={11} />
                        Gratis
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-start gap-2">
                    <p className="min-w-0 flex-1 font-semibold leading-5 text-white">
                      {event.title}
                    </p>
                    <ExternalLink
                      size={15}
                      className="mt-0.5 shrink-0 text-slate-500 transition group-hover:text-blue-300"
                    />
                  </div>

                  {event.place && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                      <MapPin size={13} />
                      <span className="truncate">
                        {event.place}
                      </span>
                    </p>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
}
