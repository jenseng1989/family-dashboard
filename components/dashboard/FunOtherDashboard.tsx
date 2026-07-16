"use client";

import {
  AlertTriangle,
  CalendarClock,
  Laugh,
  Leaf,
  LoaderCircle,
  MapPin,
  PawPrint,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";

type FunOtherData = {
  generatedAt: string;
  animal: {
    name: string;
    emoji: string;
    habitat: string;
    fact: string;
    category: string;
    rarity: string;
  };
  historyEvent: {
    year: number;
    title: string;
    description: string;
    emoji: string;
    category: string;
  };
  dadJoke: {
    setup: string;
    punchline: string;
    emoji: string;
  };
};

type FactCardProps = {
  eyebrow: string;
  title: string;
  emoji: string;
  badge: string;
  children: ReactNode;
  footer: string;
  accent: "emerald" | "sky" | "amber";
};

const CARD_STYLES = {
  emerald: {
    frame: "border-emerald-300/70 bg-gradient-to-br from-emerald-50 via-white to-emerald-100",
    badge: "border-emerald-200 bg-emerald-100 text-emerald-800",
    icon: "from-emerald-100 via-lime-50 to-amber-50",
    title: "text-emerald-900",
    detail: "border-emerald-200/80 bg-emerald-50/90",
    label: "text-emerald-700",
  },
  sky: {
    frame: "border-sky-300/70 bg-gradient-to-br from-sky-50 via-white to-indigo-100",
    badge: "border-sky-200 bg-sky-100 text-sky-800",
    icon: "from-sky-100 via-indigo-50 to-violet-100",
    title: "text-sky-900",
    detail: "border-sky-200/80 bg-sky-50/90",
    label: "text-sky-700",
  },
  amber: {
    frame: "border-amber-300/70 bg-gradient-to-br from-amber-50 via-white to-orange-100",
    badge: "border-amber-200 bg-amber-100 text-amber-800",
    icon: "from-amber-100 via-yellow-50 to-orange-100",
    title: "text-amber-900",
    detail: "border-amber-200/80 bg-amber-50/90",
    label: "text-amber-700",
  },
} as const;

function FactCard({
  eyebrow,
  title,
  emoji,
  badge,
  children,
  footer,
  accent,
}: FactCardProps) {
  const styles = CARD_STYLES[accent];

  return (
    <article
      className={[
        "relative overflow-hidden rounded-[1.75rem] border-[3px] p-3",
        "shadow-xl shadow-slate-950/10 transition duration-300 hover:-translate-y-1",
        styles.frame,
      ].join(" ")}
    >
      <div className="absolute right-4 top-4 h-14 w-14 rounded-full border border-white/70 bg-white/35 blur-xl" />

      <div className="relative rounded-[1.35rem] border border-white/80 bg-white/55 p-4 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              className={[
                "text-xs font-black uppercase tracking-[0.18em]",
                styles.label,
              ].join(" ")}
            >
              {eyebrow}
            </p>

            <h3
              className={[
                "mt-1 text-2xl font-black leading-tight",
                styles.title,
              ].join(" ")}
            >
              {title}
            </h3>
          </div>

          <span
            className={[
              "shrink-0 rounded-full border px-3 py-1 text-xs font-black",
              styles.badge,
            ].join(" ")}
          >
            {badge}
          </span>
        </div>

        <div
          className={[
            "mt-4 flex aspect-[4/3] items-center justify-center rounded-2xl border-2 border-white/90 bg-gradient-to-br text-8xl shadow-inner shadow-slate-950/5",
            styles.icon,
          ].join(" ")}
        >
          {emoji}
        </div>

        <div
          className={[
            "mt-4 rounded-2xl border p-4",
            styles.detail,
          ].join(" ")}
        >
          {children}
        </div>

        <p className="mt-4 border-t border-slate-300/50 pt-3 text-xs font-semibold text-slate-500">
          {footer}
        </p>
      </div>
    </article>
  );
}

export default function FunOtherDashboard() {
  const [data, setData] =
    useState<FunOtherData | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/fun", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          `API-fel ${response.status}`
        );
      }

      const result =
        (await response.json()) as FunOtherData;

      setData(result);
    } catch (error) {
      console.error(
        "Kunde inte hämta Kul & Fakta:",
        error
      );

      setErrorMessage(
        "Kunde inte hämta dagens innehåll just nu."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <section className="relative overflow-hidden rounded-[2rem] border border-emerald-200/30 bg-gradient-to-br from-emerald-100/90 via-sky-100/90 to-amber-50/90 p-6 shadow-2xl shadow-emerald-950/10">
        <div className="flex min-h-80 flex-col items-center justify-center gap-4">
          <LoaderCircle
            size={34}
            className="animate-spin text-emerald-600"
          />

          <p className="font-semibold text-slate-700">
            Kontaktar professor Baltazar…
          </p>
        </div>
      </section>
    );
  }

  if (!data || errorMessage) {
    return (
      <section className="rounded-[2rem] border border-red-200/50 bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 p-6 shadow-2xl shadow-red-950/10">
        <div className="flex min-h-72 flex-col items-center justify-center text-center">
          <AlertTriangle
            size={34}
            className="text-red-500"
          />

          <p className="mt-5 text-xl font-bold text-slate-900">
            Hoppsan!
          </p>

          <p className="mt-2 text-sm text-slate-600">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() => void loadData()}
            className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-lg transition hover:bg-emerald-500"
          >
            <RefreshCw size={18} />
            Försök igen
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-emerald-200/30 bg-gradient-to-br from-emerald-100/90 via-sky-100/90 to-amber-50/90 p-4 shadow-2xl shadow-emerald-950/10 sm:p-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" />

        <Leaf
          className="absolute left-[5%] top-[8%] rotate-[-20deg] text-emerald-600/10"
          size={46}
        />

        <PawPrint
          className="absolute bottom-[8%] right-[6%] rotate-[25deg] text-slate-700/[0.05]"
          size={54}
        />
      </div>

      <div className="relative z-10">
        <header className="mb-5 rounded-3xl border border-white/70 bg-white/55 p-5 shadow-xl shadow-emerald-950/5 backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
                <Sparkles size={17} />
                Upptäckarhörnan
              </p>

              <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
                Kul & Fakta
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Tre nya samlarkort varje dag med djur,
                historia och ett riktigt torrt pappaskämt.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadData()}
              className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-600/15 bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:-translate-y-0.5 hover:bg-emerald-500"
            >
              <RefreshCw size={17} />
              Uppdatera
            </button>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          <FactCard
            eyebrow="Dagens djur"
            title={data.animal.name}
            emoji={data.animal.emoji}
            badge={data.animal.rarity}
            accent="emerald"
            footer={`Typ: ${data.animal.category}`}
          >
            <div className="flex items-start gap-3">
              <MapPin
                size={18}
                className="mt-0.5 shrink-0 text-emerald-700"
              />

              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                  Lever i
                </p>

                <p className="mt-1 font-semibold text-slate-800">
                  {data.animal.habitat}
                </p>
              </div>
            </div>

            <p className="mt-4 text-base font-semibold leading-7 text-slate-800">
              {data.animal.fact}
            </p>
          </FactCard>

          <FactCard
            eyebrow="Dagens historiska händelse"
            title={data.historyEvent.title}
            emoji={data.historyEvent.emoji}
            badge={String(data.historyEvent.year)}
            accent="sky"
            footer={data.historyEvent.category}
          >
            <div className="flex items-start gap-3">
              <CalendarClock
                size={18}
                className="mt-0.5 shrink-0 text-sky-700"
              />

              <p className="text-base font-semibold leading-7 text-slate-800">
                {data.historyEvent.description}
              </p>
            </div>
          </FactCard>

          <FactCard
            eyebrow="Dagens pappaskämt"
            title="Extremt torr humor"
            emoji={data.dadJoke.emoji}
            badge="Pappa-nivå"
            accent="amber"
            footer="Risk för himlande ögon"
          >
            <div className="flex items-start gap-3">
              <Laugh
                size={18}
                className="mt-0.5 shrink-0 text-amber-700"
              />

              <div>
                <p className="font-semibold leading-7 text-slate-800">
                  {data.dadJoke.setup}
                </p>

                <p className="mt-3 text-lg font-black leading-7 text-amber-900">
                  {data.dadJoke.punchline}
                </p>
              </div>
            </div>
          </FactCard>
        </div>

        <p className="mt-5 text-center text-xs font-medium text-slate-500">
          Nya kort väljs automatiskt varje dag · Senast
          uppdaterad{" "}
          {new Date(
            data.generatedAt
          ).toLocaleTimeString("sv-SE", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </section>
  );
}