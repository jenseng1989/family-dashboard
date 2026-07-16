"use client";

import { ReactNode, useState } from "react";
import {
  CloudSun,
  Home,
  Sparkles,
  Users,
} from "lucide-react";

type TabId =
  | "weather"
  | "home"
  | "family"
  | "fun";

type DashboardTabsProps = {
  weatherContent: ReactNode;
  electricityContent: ReactNode;
  familyContent: ReactNode;
  funContent: ReactNode;
};

type TabButton = {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: ReactNode;
};

const tabs: TabButton[] = [
  {
    id: "home",
    label: "Hem",
    shortLabel: "Hem",
    icon: <Home size={20} />,
  },
  {
    id: "weather",
    label: "Väder & bad",
    shortLabel: "Väder",
    icon: <CloudSun size={20} />,
  },
  {
    id: "family",
    label: "Familjen",
    shortLabel: "Familj",
    icon: <Users size={20} />,
  },
  {
    id: "fun",
    label: "Roligt",
    shortLabel: "Roligt",
    icon: <Sparkles size={20} />,
  },
];

export default function DashboardTabs({
  weatherContent,
  electricityContent,
  familyContent,
  funContent,
}: DashboardTabsProps) {
  const [activeTab, setActiveTab] =
    useState<TabId>("home");

  function getActiveContent(): ReactNode {
    switch (activeTab) {
      case "home":
        return electricityContent;

      case "family":
        return familyContent;

      case "fun":
        return funContent;

      case "weather":
      default:
        return weatherContent;
    }
  }

  return (
    <div className="w-full min-w-0">
      <nav
        aria-label="Dashboardflikar"
        className="mb-6 w-full rounded-3xl border border-white/10 bg-white/[0.08] p-2 shadow-2xl shadow-black/10 backdrop-blur-xl"
      >
        <div
          className="grid w-full grid-cols-4 gap-2"
          role="tablist"
        >
          {tabs.map((tab) => {
            const isActive =
              activeTab === tab.id;

            const isFunTab =
              tab.id === "fun";

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() =>
                  setActiveTab(tab.id)
                }
                className={[
                  "flex min-h-14 min-w-0 items-center justify-center gap-2 rounded-2xl px-2 py-3",
                  "text-xs font-semibold transition duration-300 sm:text-sm",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
                  isActive && isFunTab
                    ? "bg-violet-500 text-white shadow-lg shadow-violet-950/40"
                    : isActive
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-950/30"
                      : "text-slate-300 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                <span
                  className={
                    isActive
                      ? "shrink-0 text-white"
                      : "shrink-0 text-slate-400"
                  }
                >
                  {tab.icon}
                </span>

                <span className="hidden min-w-0 truncate md:inline">
                  {tab.label}
                </span>

                <span className="min-w-0 truncate md:hidden">
                  {tab.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <div
        key={activeTab}
        role="tabpanel"
        className="w-full min-w-0 animate-[fadeIn_300ms_ease-out]"
      >
        {getActiveContent()}
      </div>
    </div>
  );
}