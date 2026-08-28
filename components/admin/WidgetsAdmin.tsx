"use client";

import {
  ArrowLeft,
  Baby,
  Bath,
  CalendarClock,
  CheckCircle2,
  CloudSun,
  Coins,
  Compass,
  Gauge,
  Heart,
  Home,
  ListChecks,
  LoaderCircle,
  MapPin,
  ReceiptText,
  Rocket,
  Scale,
  ShoppingCart,
  Smile,
  Sparkles,
  Syringe,
  UserRound,
  Users,
  Wind,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getWidgetSettings,
  setWidgetVisibility,
  setWidgetOrder,
} from "@/lib/widget-settings";

type WidgetItem = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  size: "Helbredd" | "Halvbredd";
};

type WidgetGroup = {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  widgets: WidgetItem[];
};

const groups: WidgetGroup[] = [
  {
    title: "Start · Vardagen",
    subtitle: "Innehållet kommer från EverydayOverview.",
    icon: Home,
    widgets: [
      { id: "everyday-overview", name: "Vardagsöversikt", description: "Samlad översikt för vardagen.", icon: Gauge, size: "Helbredd" },
    ],
  },
  {
    title: "Start · Hemmet",
    icon: Home,
    widgets: [
      { id: "vacation-plan", name: "Dagsplanering", description: "Planering av dagen.", icon: CalendarClock, size: "Helbredd" },
      { id: "countdown", name: "Nedräkning", description: "Nedräkningar till kommande datum.", icon: CalendarClock, size: "Helbredd" },
      { id: "electricity", name: "Elpris", description: "Aktuella elpriser och prisutveckling.", icon: Coins, size: "Helbredd" },
    ],
  },
  {
    title: "Start · Inköp",
    icon: ShoppingCart,
    widgets: [
      { id: "shopping-list", name: "Inköpslista", description: "Familjens gemensamma inköpslista.", icon: ListChecks, size: "Halvbredd" },
      { id: "expenses", name: "Utgifter", description: "Översikt och registrering av utgifter.", icon: ReceiptText, size: "Halvbredd" },
    ],
  },
  {
    title: "Väder & bad",
    icon: CloudSun,
    widgets: [
      { id: "weather", name: "Väder", description: "Aktuellt väder och prognos.", icon: CloudSun, size: "Halvbredd" },
      { id: "bathing", name: "Badtemperaturer", description: "Badplatser och aktuella temperaturer.", icon: Bath, size: "Halvbredd" },
      { id: "pollen", name: "Pollen", description: "Aktuellt pollenläge.", icon: Wind, size: "Helbredd" },
    ],
  },
  {
    title: "Familjen · Gemensam",
    icon: Users,
    widgets: [
      { id: "family-timeline", name: "Family Timeline", description: "Familjens gemensamma tidslinje.", icon: Users, size: "Helbredd" },
    ],
  },
  {
    title: "Familjen · Jens",
    icon: UserRound,
    widgets: [
      { id: "jens-overview", name: "Översikt", description: "Personlig översikt för Jens.", icon: UserRound, size: "Helbredd" },
      { id: "jens-personal-center", name: "Personligt center", description: "Jens personliga innehåll.", icon: Heart, size: "Helbredd" },
    ],
  },
  {
    title: "Familjen · Lenita",
    icon: UserRound,
    widgets: [
      { id: "lenita-overview", name: "Översikt", description: "Personlig översikt för Lenita.", icon: UserRound, size: "Helbredd" },
      { id: "lenita-personal-center", name: "Personligt center", description: "Lenitas personliga innehåll.", icon: Heart, size: "Helbredd" },
    ],
  },
  {
    title: "Familjen · Signe",
    icon: Baby,
    widgets: [
      { id: "signe-overview", name: "Översikt", description: "Signes sammanfattande översikt.", icon: Baby, size: "Helbredd" },
      { id: "signe-growth", name: "Tillväxt", description: "Sammanfattning av Signes tillväxt.", icon: Sparkles, size: "Helbredd" },
      { id: "signe-weight", name: "Viktutveckling", description: "Graf och utveckling för vikt.", icon: Scale, size: "Helbredd" },
      { id: "signe-height", name: "Längdutveckling", description: "Graf och utveckling för längd.", icon: Gauge, size: "Helbredd" },
      { id: "signe-teeth", name: "Tänder", description: "Registrering och översikt över tänder.", icon: Smile, size: "Helbredd" },
      { id: "signe-vaccinations", name: "Vaccinationer", description: "Vaccinationsschema och registrering.", icon: Syringe, size: "Helbredd" },
      { id: "signe-history", name: "Mäthistorik", description: "Historik över registrerade mätningar.", icon: ListChecks, size: "Helbredd" },
    ],
  },
  {
    title: "Göteborg",
    icon: MapPin,
    widgets: [
      { id: "gothenburg", name: "Göteborg", description: "Västtrafik, luftkvalitet och lokala funktioner.", icon: MapPin, size: "Helbredd" },
    ],
  },
  {
    title: "Utforska",
    icon: Compass,
    widgets: [
      { id: "fun-space", name: "Rymden", description: "Rymdrelaterat innehåll.", icon: Rocket, size: "Helbredd" },
      { id: "fun-other", name: "Kul & fakta", description: "Dagens djur, historia och pappaskämt.", icon: Sparkles, size: "Helbredd" },
      { id: "fun-sky", name: "Himlen", description: "Information om himlen och astronomi.", icon: CloudSun, size: "Helbredd" },
    ],
  },
];

export default function WidgetsAdmin() {
  const [visibility, setVisibility] =
    useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] =
    useState(true);
  const [savingId, setSavingId] =
    useState<string | null>(null);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);
  const [orderedGroups, setOrderedGroups] =
    useState<WidgetGroup[]>(groups);

  const totalWidgets = useMemo(
    () =>
      groups.reduce(
        (sum, group) =>
          sum + group.widgets.length,
        0
      ),
    []
  );

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const settings =
        await getWidgetSettings();

      const nextVisibility:
        Record<string, boolean> = {};

      for (const group of groups) {
        for (const widget of group.widgets) {
          const setting =
            settings.find(
              (item) =>
                item.widgetId ===
                widget.id
            );

          nextVisibility[widget.id] =
            setting?.isVisible ??
            true;
        }
      }

      setVisibility(
        nextVisibility
      );

      const orderMap = new Map(
        settings.map((item) => [
          item.widgetId,
          item.sortOrder,
        ])
      );

      setOrderedGroups(
        groups.map((group) => ({
          ...group,
          widgets: [...group.widgets].sort(
            (a, b) =>
              (orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
              (orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER)
          ),
        }))
      );
    } catch (error) {
      console.error(
        "Kunde inte läsa widgetinställningar i Admin:",
        error
      );

      setErrorMessage(
        "Widgetinställningarna kunde inte hämtas."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function toggleWidget(
    widgetId: string
  ) {
    const currentValue =
      visibility[widgetId] ??
      true;

    const nextValue =
      !currentValue;

    setSavingId(
      widgetId
    );

    setErrorMessage(null);

    // Optimistisk uppdatering för snabb respons.
    setVisibility(
      (current) => ({
        ...current,
        [widgetId]:
          nextValue,
      })
    );

    try {
      await setWidgetVisibility(
        widgetId,
        nextValue
      );

      window.dispatchEvent(
        new Event(
          "widget-settings-changed"
        )
      );
    } catch (error) {
      console.error(
        `Kunde inte spara widgetinställningen för "${widgetId}":`,
        error
      );

      setVisibility(
        (current) => ({
          ...current,
          [widgetId]:
            currentValue,
        })
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Widgetinställningen kunde inte sparas."
      );
    } finally {
      setSavingId(
        null
      );
    }
  }

  async function moveWidget(
    groupTitle: string,
    widgetId: string,
    direction: "up" | "down"
  ) {
    const group = orderedGroups.find(
      (item) => item.title === groupTitle
    );
    if (!group) return;

    const index = group.widgets.findIndex(
      (widget) => widget.id === widgetId
    );
    const targetIndex =
      direction === "up" ? index - 1 : index + 1;

    if (
      index < 0 ||
      targetIndex < 0 ||
      targetIndex >= group.widgets.length
    ) {
      return;
    }

    const nextWidgets = [...group.widgets];
    [nextWidgets[index], nextWidgets[targetIndex]] = [
      nextWidgets[targetIndex],
      nextWidgets[index],
    ];

    setOrderedGroups((current) =>
      current.map((item) =>
        item.title === groupTitle
          ? { ...item, widgets: nextWidgets }
          : item
      )
    );

    setSavingId(widgetId);
    setErrorMessage(null);

    try {
      await setWidgetOrder(
        nextWidgets.map((widget) => widget.id)
      );

      window.dispatchEvent(
        new Event("widget-settings-changed")
      );
    } catch (error) {
      console.error("Kunde inte spara widgetordningen:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Widgetordningen kunde inte sparas."
      );
      await loadSettings();
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-white"
          >
            <ArrowLeft size={17} />
            Till Admin
          </Link>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">
                Admin
              </p>

              <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                Widgets
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                Visa, dölj och ändra ordningen på dashboardens widgets.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">
                Registrerade
              </p>

              <p className="mt-1 text-xl font-bold text-white">
                {totalWidgets} widgets
              </p>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-emerald-300/15 bg-white/10 px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <CheckCircle2
              className="mt-0.5 shrink-0 text-emerald-300"
              size={18}
            />

            <p className="text-sm leading-6 text-slate-300">
              Ändringar sparas direkt i Supabase. Använd pilarna för att flytta widgets inom samma sektion. Visa/Dölj fortsätter fungera som tidigare.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-5 flex min-h-72 items-center justify-center rounded-3xl border border-white/10 bg-white/10 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <LoaderCircle
                size={30}
                className="animate-spin text-blue-300"
              />

              <p className="text-sm">
                Hämtar widgetinställningar…
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {orderedGroups.map(
              (group) => {
                const GroupIcon =
                  group.icon;

                return (
                  <section
                    key={
                      group.title
                    }
                    className="overflow-hidden rounded-3xl border border-white/10 bg-white/10 shadow-2xl shadow-black/20 backdrop-blur-xl"
                  >
                    <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-blue-500/20 text-blue-300">
                        <GroupIcon
                          size={20}
                        />
                      </div>

                      <div>
                        <h2 className="font-bold text-white">
                          {
                            group.title
                          }
                        </h2>

                        {group.subtitle && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            {
                              group.subtitle
                            }
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-2">
                      {group.widgets.map(
                        (
                          widget
                        ) => {
                          const WidgetIcon =
                            widget.icon;

                          const isVisible =
                            visibility[
                              widget.id
                            ] ??
                            true;

                          const isSaving =
                            savingId ===
                            widget.id;

                          return (
                            <article
                              key={
                                widget.id
                              }
                              className={[
                                "flex items-center gap-4 rounded-2xl border p-4 transition",
                                isVisible
                                  ? "border-white/10 bg-slate-950/25"
                                  : "border-white/[0.06] bg-slate-950/10 opacity-65",
                              ].join(
                                " "
                              )}
                            >
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
                                <WidgetIcon
                                  size={21}
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-semibold text-white">
                                    {
                                      widget.name
                                    }
                                  </h3>

                                  <span
                                    className={[
                                      "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]",
                                      isVisible
                                        ? "border-emerald-300/10 bg-emerald-400/[0.06] text-emerald-300"
                                        : "border-slate-400/10 bg-slate-400/[0.06] text-slate-400",
                                    ].join(
                                      " "
                                    )}
                                  >
                                    {isVisible
                                      ? "Aktiv"
                                      : "Dold"}
                                  </span>
                                </div>

                                <p className="mt-1 text-sm text-slate-400">
                                  {
                                    widget.description
                                  }
                                </p>

                                <p className="mt-2 text-xs font-semibold text-slate-500">
                                  {
                                    widget.size
                                  }
                                </p>
                              </div>

                              <div className="flex shrink-0 items-center gap-2">
                                <div className="flex flex-col gap-1">
                                  <button
                                    type="button"
                                    aria-label={`Flytta ${widget.name} upp`}
                                    disabled={
                                      isSaving ||
                                      group.widgets.findIndex((item) => item.id === widget.id) === 0
                                    }
                                    onClick={() =>
                                      void moveWidget(group.title, widget.id, "up")
                                    }
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-slate-300 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-25"
                                  >
                                    <ArrowUp size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={`Flytta ${widget.name} ner`}
                                    disabled={
                                      isSaving ||
                                      group.widgets.findIndex((item) => item.id === widget.id) === group.widgets.length - 1
                                    }
                                    onClick={() =>
                                      void moveWidget(group.title, widget.id, "down")
                                    }
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-slate-300 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-25"
                                  >
                                    <ArrowDown size={14} />
                                  </button>
                                </div>

                              <button
                                type="button"
                                role="switch"
                                aria-checked={
                                  isVisible
                                }
                                aria-label={`${isVisible ? "Dölj" : "Visa"} ${widget.name}`}
                                onClick={() =>
                                  void toggleWidget(
                                    widget.id
                                  )
                                }
                                disabled={
                                  isSaving
                                }
                                className={[
                                  "relative h-7 w-12 shrink-0 rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:opacity-50",
                                  isVisible
                                    ? "border-blue-400/30 bg-blue-500"
                                    : "border-white/10 bg-white/10",
                                ].join(
                                  " "
                                )}
                              >
                                <span
                                  className={[
                                    "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition",
                                    isVisible
                                      ? "left-6"
                                      : "left-1",
                                  ].join(
                                    " "
                                  )}
                                />

                                {isSaving && (
                                  <LoaderCircle
                                    size={12}
                                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-slate-900"
                                  />
                                )}
                              </button>
                              </div>
                            </article>
                          );
                        }
                      )}
                    </div>
                  </section>
                );
              }
            )}
          </div>
        )}
      </div>
    </main>
  );
}
