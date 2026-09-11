"use client";

import {
  Activity,
  AppWindow,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Eye,
  EyeOff,
  LayoutGrid,
  LoaderCircle,
  MousePointerClick,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  adultFamilyWidgetTemplates,
  childFamilyWidgetTemplates,
  widgetGroups as groups,
  type DynamicFamilyWidgetTemplate,
  type WidgetGroup,
  type WidgetItem,
} from "@/config/widgets";
import {
  getFamilyMembersFromDatabase,
} from "@/lib/family-db";
import type {
  FamilyMember,
} from "@/lib/family";
import {
  getWidgetSettings,
  type WidgetSize,
} from "@/lib/widget-settings";
import {
  getDashboardAnalytics,
  type DashboardAnalyticsEvent,
  type DashboardAnalyticsTabId,
} from "@/lib/dashboard-analytics";

const ANALYTICS_TABS: Array<{
  id: DashboardAnalyticsTabId;
  label: string;
}> = [
  { id: "home", label: "Start" },
  { id: "weather", label: "Väder" },
  { id: "family", label: "Familjen" },
  { id: "gothenburg", label: "Göteborg" },
  { id: "fun", label: "Utforska" },
];

const FAMILY_WIDGET_META: Record<
  string,
  Pick<WidgetItem, "name" | "description" | "icon">
> = {
  todos: {
    name: "Personlig att göra-lista",
    description:
      "Personliga uppgifter som familjemedlemmen behöver göra.",
    icon: Activity,
  },
  notes: {
    name: "Personliga anteckningar",
    description:
      "Personliga anteckningar för familjemedlemmen.",
    icon: Activity,
  },
  growth: {
    name: "Tillväxt",
    description:
      "Samlad översikt över barnets tillväxt.",
    icon: Activity,
  },
  weight: {
    name: "Vikt",
    description:
      "Barnets vikt och viktutveckling.",
    icon: Activity,
  },
  height: {
    name: "Längd",
    description:
      "Barnets längd och längdutveckling.",
    icon: Activity,
  },
  teeth: {
    name: "Tänder",
    description:
      "Barnets tandutveckling.",
    icon: Activity,
  },
  vaccinations: {
    name: "Vaccinationer",
    description:
      "Barnets vaccinationer och vaccinationsöversikt.",
    icon: Activity,
  },
  history: {
    name: "Mäthistorik",
    description:
      "Historik över barnets registrerade mätningar.",
    icon: Activity,
  },
};

function getDefaultSize(
  template: DynamicFamilyWidgetTemplate
): WidgetSize {
  return template.dashboardClassName.includes(
    "xl:col-span-6"
  )
    ? "half"
    : "full";
}

function buildFamilyWidgets(
  member: FamilyMember
): WidgetItem[] {
  const isChild =
    member.memberType === "child";

  const prefix = `${
    isChild ? "child" : "adult"
  }-${member.id}`;

  const templates = isChild
    ? childFamilyWidgetTemplates
    : adultFamilyWidgetTemplates;

  return templates
    .filter(
      (template) =>
        template.suffix !== "overview"
    )
    .map((template) => {
      const meta =
        FAMILY_WIDGET_META[template.suffix];

      return {
        id: `${prefix}-${template.suffix}`,
        name:
          meta?.name ??
          template.suffix,
        description:
          meta?.description ??
          "Dynamisk familjewidget.",
        icon:
          meta?.icon ??
          Users,
        defaultSize:
          getDefaultSize(template),
        dashboardClassName:
          template.dashboardClassName,
      };
    });
}

function buildFamilyAdminGroups(
  members: FamilyMember[]
): WidgetGroup[] {
  return [...members]
    .sort(
      (a, b) =>
        a.sortOrder -
        b.sortOrder
    )
    .map((member) => ({
      key: `family-member-${member.id}`,
      title: `Familjen · ${member.displayName}`,
      subtitle: [
        member.memberType === "child"
          ? "Barn"
          : "Vuxen",
        member.isActive
          ? "Aktiv"
          : "Inaktiv",
      ].join(" · "),
      icon: Users,
      widgets:
        buildFamilyWidgets(member),
    }));
}

function mergeFamilyGroups(
  familyGroups: WidgetGroup[]
): WidgetGroup[] {
  const result: WidgetGroup[] = [];

  for (const group of groups) {
    result.push(group);

    if (
      group.key ===
      "family-shared"
    ) {
      result.push(...familyGroups);
    }
  }

  return result;
}

export default function StatisticsAdmin() {
  const [availableGroups, setAvailableGroups] =
    useState<WidgetGroup[]>(groups);

  const [visibility, setVisibility] =
    useState<Record<string, boolean>>({});

  const [familyMembers, setFamilyMembers] =
    useState<FamilyMember[]>([]);

  const [analytics, setAnalytics] =
    useState<DashboardAnalyticsEvent[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const loadStatistics =
    useCallback(async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [
          settings,
          members,
          analyticsEvents,
        ] = await Promise.all([
          getWidgetSettings(),
          getFamilyMembersFromDatabase(),
          getDashboardAnalytics(30),
        ]);

        const familyGroups =
          buildFamilyAdminGroups(members);

        const nextGroups =
          mergeFamilyGroups(familyGroups);

        const nextVisibility:
          Record<string, boolean> = {};

        for (const group of nextGroups) {
          for (const widget of group.widgets) {
            const setting =
              settings.find(
                (item) =>
                  item.widgetId === widget.id
              );

            nextVisibility[widget.id] =
              setting?.isVisible ?? true;
          }
        }

        setAvailableGroups(nextGroups);
        setVisibility(nextVisibility);
        setFamilyMembers(members);
        setAnalytics(analyticsEvents);
      } catch (error) {
        console.error(
          "Kunde inte läsa statistik i Admin:",
          error
        );

        setErrorMessage(
          "Statistiken kunde inte hämtas."
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadStatistics();
  }, [loadStatistics]);

  const statistics = useMemo(() => {
    const totalWidgets =
      availableGroups.reduce(
        (sum, group) =>
          sum + group.widgets.length,
        0
      );

    const visibleWidgets =
      availableGroups.reduce(
        (sum, group) =>
          sum +
          group.widgets.filter(
            (widget) =>
              visibility[widget.id] ??
              true
          ).length,
        0
      );

    const hiddenWidgets =
      Math.max(
        totalWidgets -
          visibleWidgets,
        0
      );

    const activeMembers =
      familyMembers.filter(
        (member) =>
          member.isActive
      ).length;

    const children =
      familyMembers.filter(
        (member) =>
          member.memberType ===
          "child"
      ).length;

    return {
      totalWidgets,
      visibleWidgets,
      hiddenWidgets,
      activeMembers,
      children,
    };
  }, [
    availableGroups,
    visibility,
    familyMembers,
  ]);

  const usageStatistics = useMemo(() => {
    const dashboardViews =
      analytics.filter(
        (event) =>
          event.eventType === "dashboard_view"
      );

    const tabViews =
      analytics.filter(
        (event) =>
          event.eventType === "tab_view" &&
          event.tabId
      );

    const tabCounts = ANALYTICS_TABS.map(
      (tab) => ({
        ...tab,
        count: tabViews.filter(
          (event) =>
            event.tabId === tab.id
        ).length,
      })
    );

    const mostUsedTab =
      [...tabCounts].sort(
        (a, b) =>
          b.count - a.count
      )[0];

    const maxTabCount =
      Math.max(
        ...tabCounts.map(
          (tab) => tab.count
        ),
        1
      );

    const today = new Date();
    const dailyViews = Array.from(
      { length: 30 },
      (_, index) => {
        const date = new Date(today);
        date.setHours(0, 0, 0, 0);
        date.setDate(
          date.getDate() - (29 - index)
        );

        const nextDate =
          new Date(date);
        nextDate.setDate(
          nextDate.getDate() + 1
        );

        const count =
          dashboardViews.filter(
            (event) => {
              const eventDate =
                new Date(event.createdAt);

              return (
                eventDate >= date &&
                eventDate < nextDate
              );
            }
          ).length;

        return {
          date,
          count,
        };
      }
    );

    const maxDailyViews =
      Math.max(
        ...dailyViews.map(
          (day) => day.count
        ),
        1
      );

    return {
      dashboardViews:
        dashboardViews.length,
      tabViews:
        tabViews.length,
      tabCounts,
      mostUsedTab:
        mostUsedTab?.count
          ? mostUsedTab
          : null,
      maxTabCount,
      dailyViews,
      maxDailyViews,
    };
  }, [analytics]);

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

          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.08] text-cyan-200">
              <BarChart3 size={27} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Admin
              </p>

              <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                Statistik
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                Överblick över Family Dashboard och dess
                nuvarande innehåll.
              </p>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="mt-5 flex min-h-72 items-center justify-center rounded-3xl border border-white/10 bg-white/10">
            <LoaderCircle
              size={30}
              className="animate-spin text-cyan-300"
            />
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <StatCard
                label="Widgets"
                value={statistics.totalWidgets}
                icon={AppWindow}
              />

              <StatCard
                label="Synliga"
                value={statistics.visibleWidgets}
                icon={Eye}
              />

              <StatCard
                label="Dolda"
                value={statistics.hiddenWidgets}
                icon={EyeOff}
              />

              <StatCard
                label="Aktiva personer"
                value={statistics.activeMembers}
                icon={Users}
              />

              <StatCard
                label="Barn"
                value={statistics.children}
                icon={Users}
              />
            </div>

            <section className="mt-5 rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-400/[0.08] text-cyan-200">
                    <BarChart3 size={20} />
                  </div>

                  <div>
                    <h2 className="font-bold text-white">
                      Användning senaste 30 dagarna
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Anonym statistik från dashboardens huvudflikar.
                    </p>
                  </div>
                </div>

                <span className="w-fit rounded-full border border-cyan-300/15 bg-cyan-400/[0.06] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-cyan-200">
                  Statistik 2.0
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
                <UsageCard
                  label="Dashboardbesök"
                  value={usageStatistics.dashboardViews}
                  icon={CalendarDays}
                />

                <UsageCard
                  label="Flikvisningar"
                  value={usageStatistics.tabViews}
                  icon={MousePointerClick}
                />

                <article className="col-span-2 rounded-2xl border border-white/10 bg-slate-950/25 p-4 lg:col-span-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                        Mest använd
                      </p>

                      <p className="mt-2 truncate text-xl font-bold text-white">
                        {usageStatistics.mostUsedTab?.label ??
                          "Ingen data ännu"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {usageStatistics.mostUsedTab
                          ? `${usageStatistics.mostUsedTab.count} flikvisningar`
                          : "Statistik byggs upp från och med nu."}
                      </p>
                    </div>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-300/10 bg-amber-400/[0.06] text-amber-200">
                      <Trophy size={19} />
                    </div>
                  </div>
                </article>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
                  <p className="text-sm font-semibold text-white">
                    Huvudflikar
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Fördelning av registrerade flikvisningar.
                  </p>

                  <div className="mt-4 space-y-4">
                    {usageStatistics.tabCounts.map(
                      (tab) => {
                        const percentage =
                          usageStatistics.tabViews > 0
                            ? Math.round(
                                (tab.count /
                                  usageStatistics.tabViews) *
                                  100
                              )
                            : 0;

                        const barWidth =
                          Math.round(
                            (tab.count /
                              usageStatistics.maxTabCount) *
                              100
                          );

                        return (
                          <div key={tab.id}>
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="font-semibold text-slate-300">
                                {tab.label}
                              </span>

                              <span className="text-xs text-slate-500">
                                {tab.count} · {percentage} %
                              </span>
                            </div>

                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                              <div
                                className="h-full rounded-full bg-cyan-400 transition-all"
                                style={{
                                  width: `${barWidth}%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
                  <p className="text-sm font-semibold text-white">
                    Dashboardbesök per dag
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Senaste 30 dagarna. Historiken fylls på från
                    den dag Statistik 2.0 aktiverades.
                  </p>

                  <div className="mt-5 flex h-44 items-end gap-1">
                    {usageStatistics.dailyViews.map(
                      (day) => {
                        const height =
                          day.count > 0
                            ? Math.max(
                                8,
                                Math.round(
                                  (day.count /
                                    usageStatistics.maxDailyViews) *
                                    100
                                )
                              )
                            : 2;

                        return (
                          <div
                            key={day.date.toISOString()}
                            className="group relative flex h-full min-w-0 flex-1 items-end"
                            title={`${day.date.toLocaleDateString(
                              "sv-SE"
                            )}: ${day.count} besök`}
                          >
                            <div
                              className={[
                                "w-full rounded-t-sm transition",
                                day.count > 0
                                  ? "bg-cyan-400/80 group-hover:bg-cyan-300"
                                  : "bg-white/[0.06]",
                              ].join(" ")}
                              style={{
                                height: `${height}%`,
                              }}
                            />
                          </div>
                        );
                      }
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                    <span>30 dagar sedan</span>
                    <span>Idag</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-5 rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-400/[0.08] text-violet-200">
                  <LayoutGrid size={20} />
                </div>

                <div>
                  <h2 className="font-bold text-white">
                    Dashboardområden
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Widgetfördelning och synlighet per område.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {availableGroups.map(
                  (group) => {
                    const total =
                      group.widgets.length;

                    const visible =
                      group.widgets.filter(
                        (widget) =>
                          visibility[
                            widget.id
                          ] ?? true
                      ).length;

                    const percentage =
                      total > 0
                        ? Math.round(
                            (visible /
                              total) *
                              100
                          )
                        : 0;

                    return (
                      <article
                        key={group.key}
                        className="rounded-2xl border border-white/10 bg-slate-950/25 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">
                              {group.title}
                            </p>

                            {group.subtitle && (
                              <p className="mt-1 text-xs text-slate-500">
                                {
                                  group.subtitle
                                }
                              </p>
                            )}
                          </div>

                          <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-bold text-slate-300">
                            {visible}/{total}
                          </span>
                        </div>

                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                          <div
                            className="h-full rounded-full bg-cyan-400 transition-all"
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>

                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="text-slate-500">
                            Synliga
                          </span>

                          <span className="font-semibold text-slate-300">
                            {percentage} %
                          </span>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            </section>

            <section className="mt-5 rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-pink-300/15 bg-pink-400/[0.08] text-pink-200">
                  <Users size={20} />
                </div>

                <div>
                  <h2 className="font-bold text-white">
                    Familjen
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Registrerade familjemedlemmar och deras status.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[...familyMembers]
                  .sort(
                    (a, b) =>
                      a.sortOrder -
                      b.sortOrder
                  )
                  .map((member) => (
                    <article
                      key={member.id}
                      className="rounded-2xl border border-white/10 bg-slate-950/25 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">
                            {
                              member.displayName
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {member.memberType ===
                            "child"
                              ? "Barn"
                              : "Vuxen"}
                          </p>
                        </div>

                        <span
                          className={[
                            "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]",
                            member.isActive
                              ? "border-emerald-300/15 bg-emerald-400/[0.08] text-emerald-300"
                              : "border-slate-300/10 bg-slate-400/[0.06] text-slate-400",
                          ].join(" ")}
                        >
                          {member.isActive
                            ? "Aktiv"
                            : "Inaktiv"}
                        </span>
                      </div>
                    </article>
                  ))}
              </div>
            </section>

            <div className="mt-5 rounded-3xl border border-cyan-300/10 bg-cyan-400/[0.04] p-5">
              <p className="text-sm font-semibold text-white">
                Statistik 2.0
              </p>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Statistikvyn kombinerar befintliga widgetinställningar och
                familjedata med anonym historik över dashboardbesök och
                huvudflikar. Historiken sparar inte person, enhet eller
                familjemedlem.
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

type UsageCardProps = {
  label: string;
  value: number;
  icon: typeof AppWindow;
};

function UsageCard({
  label,
  value,
  icon: Icon,
}: UsageCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-white">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/10 bg-cyan-400/[0.06] text-cyan-200">
          <Icon size={19} />
        </div>
      </div>
    </article>
  );
}

type StatCardProps = {
  label: string;
  value: number;
  icon: typeof AppWindow;
};

function StatCard({
  label,
  value,
  icon: Icon,
}: StatCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-xl shadow-black/10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-white">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/10 bg-cyan-400/[0.06] text-cyan-200">
          <Icon size={19} />
        </div>
      </div>
    </article>
  );
}
