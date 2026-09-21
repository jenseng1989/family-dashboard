"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Utensils,
} from "lucide-react";

import OrderedWidgetGroup from "@/components/dashboard/OrderedWidgetGroup";
import WidgetGate from "@/components/dashboard/WidgetGate";
import { getWidgetGroup } from "@/config/widgets";
import { buildDashboardWidgets } from "@/lib/dashboard-widgets";

const schoolConfig = getWidgetGroup("start-school");

function EmptySchoolWidget({
  title,
  message,
  subtitle,
  storageKey,
  icon: Icon,
}: {
  title: string;
  message: string;
  subtitle: string;
  storageKey: string;
  icon: typeof CalendarDays;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hasLoadedPreference, setHasLoadedPreference] = useState(false);

  useEffect(() => {
    try {
      setIsCollapsed(window.localStorage.getItem(storageKey) === "true");
    } catch {
      // Privat läge eller blockerad lagring: använd standardläget.
    }
    setHasLoadedPreference(true);
  }, [storageKey]);

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      window.localStorage.setItem(storageKey, String(next));
    } catch {
      // Widgeten ska fortfarande gå att minimera om lagring saknas.
    }
  };

  return (
    <section className={`w-full min-w-0 rounded-3xl border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/10 backdrop-blur-xl ${isCollapsed ? "p-3 sm:p-3" : "p-5 sm:p-6"}`}>
      <div className="flex items-center gap-3">
        <div className={`flex shrink-0 items-center justify-center rounded-xl border border-blue-300/15 bg-blue-400/[0.08] text-blue-300 ${isCollapsed ? "h-9 w-9" : "h-11 w-11"}`}>
          <Icon size={21} aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          {!isCollapsed && (
            <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
          )}
        </div>

        <button
          type="button"
          onClick={toggleCollapsed}
          disabled={!hasLoadedPreference}
          aria-expanded={!isCollapsed}
          aria-label={`${isCollapsed ? "Visa" : "Minimera"} ${title}`}
          title={isCollapsed ? "Visa" : "Minimera"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-400 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        >
          {isCollapsed ? (
            <ChevronDown size={18} aria-hidden="true" />
          ) : (
            <ChevronUp size={18} aria-hidden="true" />
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div className="mt-5 rounded-2xl border border-dashed border-blue-300/15 bg-slate-950/20 px-5 py-8 text-center sm:py-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-blue-300/15 bg-blue-400/[0.08] text-blue-300">
            <Icon size={25} aria-hidden="true" />
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-400">{message}</p>
        </div>
      )}
    </section>
  );
}

const schoolContentMap = {
  "school-schedule": (
    <EmptySchoolWidget
      storageKey="family-dashboard:school-schedule:collapsed"
      title="Skolschema"
      subtitle="Veckans schema"
      message="Inget skolschema ännu. Här visas veckans schema när funktionen aktiveras."
      icon={CalendarDays}
    />
  ),
  "school-lunch": (
    <EmptySchoolWidget
      storageKey="family-dashboard:school-lunch:collapsed"
      title="Skollunch"
      subtitle="Veckans matsedel"
      message="Ingen matsedel ännu. Här visas veckans skollunch när funktionen aktiveras."
      icon={Utensils}
    />
  ),
};

export default function StartSchoolTab() {
  return (
    <OrderedWidgetGroup
      wrapperClassName="grid w-full min-w-0 grid-cols-12 gap-5"
      itemComponent={WidgetGate}
      widgets={buildDashboardWidgets(schoolConfig, schoolContentMap)}
    />
  );
}
