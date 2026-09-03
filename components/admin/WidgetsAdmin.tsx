"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CloudSun,
  LoaderCircle,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  widgetGroups as groups,
  type WidgetGroup,
} from "@/config/widgets";

import {
  getWidgetSettings,
  setWidgetOrder,
  setWidgetSize,
  setWidgetVisibility,
  type WidgetSize,
} from "@/lib/widget-settings";

const COLLAPSED_STORAGE_KEY =
  "admin-widgets-collapsed-groups";

export default function WidgetsAdmin() {
  const [visibility, setVisibility] =
    useState<Record<string, boolean>>({});

  const [sizes, setSizes] =
    useState<Record<string, WidgetSize>>({});

  const [isLoading, setIsLoading] =
    useState(true);

  const [savingId, setSavingId] =
    useState<string | null>(null);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [orderedGroups, setOrderedGroups] =
    useState<WidgetGroup[]>(groups);

  const [collapsedGroups, setCollapsedGroups] =
    useState<Record<string, boolean>>({});

  const [collapseStateLoaded, setCollapseStateLoaded] =
    useState(false);

  const totalWidgets = useMemo(
    () =>
      groups.reduce(
        (sum, group) =>
          sum + group.widgets.length,
        0
      ),
    []
  );

  const allCollapsed = useMemo(
    () =>
      groups.every(
        (group) =>
          collapsedGroups[group.title] === true
      ),
    [collapsedGroups]
  );

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(
        COLLAPSED_STORAGE_KEY
      );

      if (storedValue) {
        const parsed = JSON.parse(
          storedValue
        ) as Record<string, boolean>;

        setCollapsedGroups(parsed);
      }
    } catch (error) {
      console.error(
        "Kunde inte läsa minimeringsläget för Admin → Widgets:",
        error
      );
    } finally {
      setCollapseStateLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!collapseStateLoaded) {
      return;
    }

    try {
      window.localStorage.setItem(
        COLLAPSED_STORAGE_KEY,
        JSON.stringify(collapsedGroups)
      );
    } catch (error) {
      console.error(
        "Kunde inte spara minimeringsläget för Admin → Widgets:",
        error
      );
    }
  }, [
    collapsedGroups,
    collapseStateLoaded,
  ]);

  const loadSettings =
    useCallback(async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const settings =
          await getWidgetSettings();

        const nextVisibility:
          Record<string, boolean> = {};

        const nextSizes:
          Record<string, WidgetSize> = {};

        for (const group of groups) {
          for (const widget of group.widgets) {
            const setting =
              settings.find(
                (item) =>
                  item.widgetId === widget.id
              );

            nextVisibility[widget.id] =
              setting?.isVisible ?? true;

            nextSizes[widget.id] =
              setting?.size ??
              widget.defaultSize;
          }
        }

        setVisibility(nextVisibility);
        setSizes(nextSizes);

        const orderMap = new Map(
          settings.map((item) => [
            item.widgetId,
            item.sortOrder,
          ])
        );

        setOrderedGroups(
          groups.map((group) => ({
            ...group,
            widgets: [
              ...group.widgets,
            ].sort(
              (a, b) =>
                (orderMap.get(a.id) ??
                  Number.MAX_SAFE_INTEGER) -
                (orderMap.get(b.id) ??
                  Number.MAX_SAFE_INTEGER)
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

  function toggleGroup(
    groupTitle: string
  ) {
    setCollapsedGroups((current) => ({
      ...current,
      [groupTitle]:
        !current[groupTitle],
    }));
  }

  function collapseAll() {
    const nextState:
      Record<string, boolean> = {};

    for (const group of groups) {
      nextState[group.title] = true;
    }

    setCollapsedGroups(nextState);
  }

  function expandAll() {
    setCollapsedGroups({});
  }

  async function toggleWidget(
    widgetId: string
  ) {
    const old =
      visibility[widgetId] ?? true;

    const next = !old;

    setSavingId(widgetId);
    setErrorMessage(null);

    setVisibility((current) => ({
      ...current,
      [widgetId]: next,
    }));

    try {
      await setWidgetVisibility(
        widgetId,
        next
      );

      window.dispatchEvent(
        new Event(
          "widget-settings-changed"
        )
      );
    } catch (error) {
      setVisibility((current) => ({
        ...current,
        [widgetId]: old,
      }));

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Widgetinställningen kunde inte sparas."
      );
    } finally {
      setSavingId(null);
    }
  }

  async function changeWidgetSize(
    widgetId: string,
    next: WidgetSize
  ) {
    const old =
      sizes[widgetId] ?? "full";

    setSavingId(widgetId);
    setErrorMessage(null);

    setSizes((current) => ({
      ...current,
      [widgetId]: next,
    }));

    try {
      await setWidgetSize(
        widgetId,
        next
      );

      window.dispatchEvent(
        new Event(
          "widget-settings-changed"
        )
      );
    } catch (error) {
      setSizes((current) => ({
        ...current,
        [widgetId]: old,
      }));

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Widgetstorleken kunde inte sparas."
      );
    } finally {
      setSavingId(null);
    }
  }

  async function moveWidget(
    groupTitle: string,
    widgetId: string,
    direction: "up" | "down"
  ) {
    const group =
      orderedGroups.find(
        (item) =>
          item.title === groupTitle
      );

    if (!group) {
      return;
    }

    const index =
      group.widgets.findIndex(
        (widget) =>
          widget.id === widgetId
      );

    const target =
      direction === "up"
        ? index - 1
        : index + 1;

    if (
      index < 0 ||
      target < 0 ||
      target >= group.widgets.length
    ) {
      return;
    }

    const next = [...group.widgets];

    [next[index], next[target]] = [
      next[target],
      next[index],
    ];

    setOrderedGroups((current) =>
      current.map((item) =>
        item.title === groupTitle
          ? {
              ...item,
              widgets: next,
            }
          : item
      )
    );

    setSavingId(widgetId);
    setErrorMessage(null);

    try {
      await setWidgetOrder(
        next.map(
          (widget) => widget.id
        )
      );

      window.dispatchEvent(
        new Event(
          "widget-settings-changed"
        )
      );
    } catch (error) {
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
                Visa, dölj, ändra ordning och välj
                storlek på dashboardens widgets.
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
              Göteborg, Rymden och Jorden visas med
              sina riktiga widgets. Underfliken Himlen
              innehåller ännu inga widgets.
            </p>
          </div>
        </div>

        {!isLoading && (
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">
                Widgetgrupper
              </p>

              <p className="mt-0.5 text-xs text-slate-500">
                Klicka på en grupp för att minimera
                eller visa innehållet.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={collapseAll}
                disabled={allCollapsed}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-default disabled:opacity-40"
              >
                <ChevronRight size={16} />
                Minimera alla
              </button>

              <button
                type="button"
                onClick={expandAll}
                disabled={
                  Object.keys(
                    collapsedGroups
                  ).length === 0
                }
                className="inline-flex items-center gap-2 rounded-xl border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/20 disabled:cursor-default disabled:opacity-40"
              >
                <ChevronDown size={16} />
                Visa alla
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="mt-5 flex min-h-72 items-center justify-center rounded-3xl border border-white/10 bg-white/10">
            <LoaderCircle
              size={30}
              className="animate-spin text-blue-300"
            />
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {orderedGroups.map(
              (group) => {
                const GroupIcon =
                  group.icon;

                const isCollapsed =
                  collapsedGroups[
                    group.title
                  ] === true;

                const visibleCount =
                  group.widgets.filter(
                    (widget) =>
                      visibility[
                        widget.id
                      ] ?? true
                  ).length;

                return (
                  <section
                    key={group.title}
                    className="overflow-hidden rounded-3xl border border-white/10 bg-white/10 shadow-2xl shadow-black/20 backdrop-blur-xl"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        toggleGroup(
                          group.title
                        )
                      }
                      aria-expanded={
                        !isCollapsed
                      }
                      className={[
                        "flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-white/[0.04]",
                        !isCollapsed
                          ? "border-b border-white/10"
                          : "",
                      ].join(" ")}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-blue-500/20 text-blue-300">
                        <GroupIcon
                          size={20}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-bold text-white">
                            {group.title}
                          </h2>

                          <span className="rounded-full border border-white/10 bg-slate-950/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                            {group.widgets.length}{" "}
                            {group.widgets.length ===
                            1
                              ? "widget"
                              : "widgets"}
                          </span>

                          {group.widgets.length >
                            0 && (
                            <span className="rounded-full border border-emerald-300/10 bg-emerald-400/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-300">
                              {visibleCount}{" "}
                              aktiva
                            </span>
                          )}
                        </div>

                        {group.subtitle && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            {
                              group.subtitle
                            }
                          </p>
                        )}
                      </div>

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-950/25 text-slate-400">
                        {isCollapsed ? (
                          <ChevronRight
                            size={19}
                          />
                        ) : (
                          <ChevronDown
                            size={19}
                          />
                        )}
                      </div>
                    </button>

                    {!isCollapsed && (
                      <>
                        {group.widgets
                          .length === 0 ? (
                          <div className="p-4">
                            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/20 px-5 py-8 text-center">
                              <CloudSun
                                size={30}
                                className="mx-auto text-slate-500"
                              />

                              <p className="mt-3 font-semibold text-slate-300">
                                Inga widgets
                                ännu
                              </p>

                              <p className="mt-1 text-sm text-slate-500">
                                Widgets som
                                läggs till här
                                kommer senare
                                kunna
                                administreras
                                från denna sida.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-2">
                            {group.widgets.map(
                              (widget) => {
                                const Icon =
                                  widget.icon;

                                const visible =
                                  visibility[
                                    widget.id
                                  ] ?? true;

                                const saving =
                                  savingId ===
                                  widget.id;

                                const size =
                                  sizes[
                                    widget.id
                                  ] ??
                                  widget.defaultSize;

                                const index =
                                  group.widgets.findIndex(
                                    (item) =>
                                      item.id ===
                                      widget.id
                                  );

                                return (
                                  <article
                                    key={
                                      widget.id
                                    }
                                    className={[
                                      "flex items-center gap-4 rounded-2xl border p-4 transition",
                                      visible
                                        ? "border-white/10 bg-slate-950/25"
                                        : "border-white/[0.06] bg-slate-950/10 opacity-65",
                                    ].join(
                                      " "
                                    )}
                                  >
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
                                      <Icon
                                        size={
                                          21
                                        }
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
                                            visible
                                              ? "border-emerald-300/10 bg-emerald-400/[0.06] text-emerald-300"
                                              : "border-slate-400/10 bg-slate-400/[0.06] text-slate-400",
                                          ].join(
                                            " "
                                          )}
                                        >
                                          {visible
                                            ? "Aktiv"
                                            : "Dold"}
                                        </span>
                                      </div>

                                      <p className="mt-1 text-sm text-slate-400">
                                        {
                                          widget.description
                                        }
                                      </p>

                                      <div className="mt-3">
                                        <label
                                          htmlFor={`widget-size-${widget.id}`}
                                          className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500"
                                        >
                                          Storlek
                                        </label>

                                        <select
                                          id={`widget-size-${widget.id}`}
                                          value={
                                            size
                                          }
                                          disabled={
                                            saving
                                          }
                                          onChange={(
                                            event
                                          ) =>
                                            void changeWidgetSize(
                                              widget.id,
                                              event
                                                .target
                                                .value as WidgetSize
                                            )
                                          }
                                          className="mt-1 block w-full max-w-40 rounded-xl border border-white/10 bg-[#151515] px-3 py-2 text-sm font-semibold text-slate-200 outline-none transition focus:border-blue-400/40 focus:ring-2 focus:ring-blue-400/20 disabled:opacity-50"
                                        >
                                          <option value="full">
                                            Helbredd
                                          </option>

                                          <option value="half">
                                            Halvbredd
                                          </option>
                                        </select>
                                      </div>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-2">
                                      <div className="flex flex-col gap-1">
                                        <button
                                          type="button"
                                          aria-label={`Flytta ${widget.name} upp`}
                                          disabled={
                                            saving ||
                                            index ===
                                              0
                                          }
                                          onClick={() =>
                                            void moveWidget(
                                              group.title,
                                              widget.id,
                                              "up"
                                            )
                                          }
                                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-slate-300 transition hover:bg-white/15 disabled:opacity-25"
                                        >
                                          <ArrowUp
                                            size={
                                              14
                                            }
                                          />
                                        </button>

                                        <button
                                          type="button"
                                          aria-label={`Flytta ${widget.name} ner`}
                                          disabled={
                                            saving ||
                                            index ===
                                              group
                                                .widgets
                                                .length -
                                                1
                                          }
                                          onClick={() =>
                                            void moveWidget(
                                              group.title,
                                              widget.id,
                                              "down"
                                            )
                                          }
                                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-slate-300 transition hover:bg-white/15 disabled:opacity-25"
                                        >
                                          <ArrowDown
                                            size={
                                              14
                                            }
                                          />
                                        </button>
                                      </div>

                                      <button
                                        type="button"
                                        role="switch"
                                        aria-checked={
                                          visible
                                        }
                                        aria-label={`${
                                          visible
                                            ? "Dölj"
                                            : "Visa"
                                        } ${
                                          widget.name
                                        }`}
                                        onClick={() =>
                                          void toggleWidget(
                                            widget.id
                                          )
                                        }
                                        disabled={
                                          saving
                                        }
                                        className={[
                                          "relative h-7 w-12 shrink-0 rounded-full border transition disabled:opacity-50",
                                          visible
                                            ? "border-blue-400/30 bg-blue-500"
                                            : "border-white/10 bg-white/10",
                                        ].join(
                                          " "
                                        )}
                                      >
                                        <span
                                          className={[
                                            "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition",
                                            visible
                                              ? "left-6"
                                              : "left-1",
                                          ].join(
                                            " "
                                          )}
                                        />

                                        {saving && (
                                          <LoaderCircle
                                            size={
                                              12
                                            }
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
                        )}
                      </>
                    )}
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
