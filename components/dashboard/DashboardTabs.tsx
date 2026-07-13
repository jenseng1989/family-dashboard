"use client";

import { ReactNode, useState } from "react";
import { CloudSun, Home, Users } from "lucide-react";

type TabId = "weather" | "home" | "family";

type DashboardTabsProps = {
  weatherContent: ReactNode;
  electricityContent: ReactNode;
  familyContent: ReactNode;
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
];

export default function DashboardTabs({
  weatherContent,
  electricityContent,
  familyContent,
}: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("home");

  function getActiveContent(): ReactNode {
    switch (activeTab) {
      case "home":
        return electricityContent;

      case "family":
        return familyContent;

      case "weather":
      default:
        return weatherContent;
    }
  }

  return (
    <div>
      <nav
        aria-label="Dashboardflikar"
        className="mb-6 rounded-3xl border border-white/10 bg-white/[0.08] p-2 shadow-2xl shadow-black/10 backdrop-blur-xl"
      >
        <div className="grid grid-cols-3 gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-selected={isActive}
                role="tab"
                className={[
                  "flex min-h-14 items-center justify-center gap-2 rounded-2xl px-3 py-3",
                  "text-sm font-semibold transition duration-300",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
                  isActive
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-950/30"
                    : "text-slate-300 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                <span className={isActive ? "text-white" : "text-slate-400"}>
                  {tab.icon}
                </span>

                <span className="hidden sm:inline">{tab.label}</span>

                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div
        key={activeTab}
        role="tabpanel"
        className="animate-[fadeIn_300ms_ease-out]"
      >
        {getActiveContent()}
      </div>
    </div>
  );
}